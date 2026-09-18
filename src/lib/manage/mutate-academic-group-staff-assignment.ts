import "server-only";

import { z } from "zod";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const academicGroupStaffAssignmentMutationSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("assign"),
    target_academic_group_id: z.uuid(),
    target_profile_id: z.uuid(),
  }),
  z.object({ intent: z.literal("unassign"), assignment_id: z.uuid() }),
]);

export type AcademicGroupStaffAssignmentActionState = {
  status: "idle" | "success" | "error";
  intent?: "assign" | "unassign";
  reason?: "invalid" | "forbidden" | "unavailable" | "notFound" | "crossUniversity"
    | "ineligibleProfile" | "targetInactive" | "groupInactive" | "programInactive";
};

export const initialAcademicGroupStaffAssignmentActionState: AcademicGroupStaffAssignmentActionState = { status: "idle" };

function safeFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// assign_professor_to_academic_group/unassign_professor_from_academic_group
// (migration 018) raise every business-rule violation with errcode 22023,
// distinguished only by message text -- the same approach already used for
// academic groups/memberships/program staff assignments.
const NOT_FOUND_MESSAGES = new Set([
  "Academic group not found",
  "Academic group staff assignment not found",
]);
const CROSS_UNIVERSITY_MESSAGES = new Set(["Target profile does not belong to the group's university"]);
const INELIGIBLE_PROFILE_MESSAGES = new Set(["Target profile is not an eligible professor for this academic program"]);
const TARGET_INACTIVE_MESSAGES = new Set(["Target profile not found or inactive"]);
const GROUP_INACTIVE_MESSAGES = new Set(["Cannot assign professor responsibility for an inactive academic group"]);
const PROGRAM_INACTIVE_MESSAGES = new Set(["Cannot assign professor responsibility for an inactive academic program"]);

function mapAssignmentError(error: { code?: string; message?: string }): NonNullable<AcademicGroupStaffAssignmentActionState["reason"]> {
  if (error.code === "42501") return "forbidden";
  if (error.code === "22023") {
    const message = error.message ?? "";
    if (NOT_FOUND_MESSAGES.has(message)) return "notFound";
    if (CROSS_UNIVERSITY_MESSAGES.has(message)) return "crossUniversity";
    if (INELIGIBLE_PROFILE_MESSAGES.has(message)) return "ineligibleProfile";
    if (TARGET_INACTIVE_MESSAGES.has(message)) return "targetInactive";
    if (GROUP_INACTIVE_MESSAGES.has(message)) return "groupInactive";
    if (PROGRAM_INACTIVE_MESSAGES.has(message)) return "programInactive";
    return "invalid";
  }
  return "unavailable";
}

export async function mutateAcademicGroupStaffAssignment(formData: FormData): Promise<AcademicGroupStaffAssignmentActionState> {
  const intent = safeFormValue(formData, "intent");
  const parsed = academicGroupStaffAssignmentMutationSchema.safeParse({
    intent,
    target_academic_group_id: safeFormValue(formData, "target_academic_group_id"),
    target_profile_id: safeFormValue(formData, "target_profile_id"),
    assignment_id: safeFormValue(formData, "assignment_id"),
  });

  if (!parsed.success) return { status: "error", reason: "invalid" };

  const [activeProfile, supabase] = await Promise.all([
    getActiveProfile(),
    createServerSupabaseClient(),
  ]);
  if (!activeProfile || !supabase) return { status: "error", reason: "unavailable" };

  const input = parsed.data;
  const result = input.intent === "assign"
    ? await supabase.rpc("assign_professor_to_academic_group", {
        requested_profile_id: activeProfile.id,
        target_academic_group_id: input.target_academic_group_id,
        target_profile_id: input.target_profile_id,
      })
    : await supabase.rpc("unassign_professor_from_academic_group", {
        requested_profile_id: activeProfile.id,
        assignment_id: input.assignment_id,
      });

  if (!result.error) return { status: "success", intent: input.intent };
  return { status: "error", intent: input.intent, reason: mapAssignmentError(result.error) };
}
