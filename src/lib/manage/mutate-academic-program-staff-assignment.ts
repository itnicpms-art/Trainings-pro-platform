import "server-only";

import { z } from "zod";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const academicProgramStaffAssignmentMutationSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("grant"),
    target_profile_id: z.uuid(),
    target_academic_program_id: z.uuid(),
    role_code: z.enum(["professor", "program_coordinator"]),
  }),
  z.object({ intent: z.literal("revoke"), assignment_id: z.uuid() }),
]);

export type AcademicProgramStaffAssignmentActionState = {
  status: "idle" | "success" | "error";
  intent?: "grant" | "revoke";
  reason?: "invalid" | "forbidden" | "unavailable" | "notFound" | "crossUniversity" | "ineligibleProfile";
};

export const initialAcademicProgramStaffAssignmentActionState: AcademicProgramStaffAssignmentActionState = { status: "idle" };

function safeFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// grant_academic_program_staff_role/revoke_academic_program_staff_role
// (migration 016) raise every business-rule violation with errcode 22023,
// distinguished only by message text -- the same approach already used for
// academic years/terms/groups/memberships.
const NOT_FOUND_MESSAGES = new Set([
  "Valid academic program required",
  "Target profile not found or inactive",
  "Academic program staff assignment not found",
]);
const CROSS_UNIVERSITY_MESSAGES = new Set(["Target profile does not belong to the program's university"]);
const INELIGIBLE_PROFILE_MESSAGES = new Set(["Target profile is not an eligible academic staff profile"]);

function mapAssignmentError(error: { code?: string; message?: string }): NonNullable<AcademicProgramStaffAssignmentActionState["reason"]> {
  if (error.code === "42501") return "forbidden";
  if (error.code === "22023") {
    const message = error.message ?? "";
    if (NOT_FOUND_MESSAGES.has(message)) return "notFound";
    if (CROSS_UNIVERSITY_MESSAGES.has(message)) return "crossUniversity";
    if (INELIGIBLE_PROFILE_MESSAGES.has(message)) return "ineligibleProfile";
    return "invalid";
  }
  return "unavailable";
}

export async function mutateAcademicProgramStaffAssignment(formData: FormData): Promise<AcademicProgramStaffAssignmentActionState> {
  const intent = safeFormValue(formData, "intent");
  const parsed = academicProgramStaffAssignmentMutationSchema.safeParse({
    intent,
    target_profile_id: safeFormValue(formData, "target_profile_id"),
    target_academic_program_id: safeFormValue(formData, "target_academic_program_id"),
    role_code: safeFormValue(formData, "role_code"),
    assignment_id: safeFormValue(formData, "assignment_id"),
  });

  if (!parsed.success) return { status: "error", reason: "invalid" };

  const [activeProfile, supabase] = await Promise.all([
    getActiveProfile(),
    createServerSupabaseClient(),
  ]);
  if (!activeProfile || !supabase) return { status: "error", reason: "unavailable" };

  const input = parsed.data;
  const result = input.intent === "grant"
    ? await supabase.rpc("grant_academic_program_staff_role", {
        requested_profile_id: activeProfile.id,
        target_profile_id: input.target_profile_id,
        target_academic_program_id: input.target_academic_program_id,
        role_code: input.role_code,
      })
    : await supabase.rpc("revoke_academic_program_staff_role", {
        requested_profile_id: activeProfile.id,
        assignment_id: input.assignment_id,
      });

  if (!result.error) return { status: "success", intent: input.intent };
  return { status: "error", intent: input.intent, reason: mapAssignmentError(result.error) };
}
