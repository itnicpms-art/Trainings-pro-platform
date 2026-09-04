import "server-only";

import { z } from "zod";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const membershipMutationSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("add"),
    target_university_id: z.uuid(),
    target_group_id: z.uuid(),
    student_profile_id: z.uuid(),
    is_primary: z.enum(["true", "false"]).transform((value) => value === "true"),
  }),
  z.object({ intent: z.literal("move"), membership_id: z.uuid(), target_group_id: z.uuid() }),
  z.object({ intent: z.literal("end"), membership_id: z.uuid() }),
  z.object({ intent: z.literal("setPrimary"), membership_id: z.uuid() }),
]);

export type StudentGroupMembershipActionState = {
  status: "idle" | "success" | "error";
  intent?: "add" | "move" | "end" | "setPrimary";
  reason?: "invalid" | "duplicate" | "forbidden" | "unavailable"
    | "studentNotEligible" | "differentProgram" | "groupArchived" | "groupInactive" | "primaryConflict";
};

export const initialStudentGroupMembershipActionState: StudentGroupMembershipActionState = { status: "idle" };

function safeFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// add_student_to_group/move_student_group_membership/end_student_group_membership/
// set_primary_group_membership (migration 012) raise every business-rule
// violation with errcode 22023, distinguished only by message text. These
// strings are authored in that migration and matched verbatim here instead
// of widening the RPC's error surface with new SQLSTATEs — the same
// approach already used for academic years/terms/groups.
const STUDENT_NOT_ELIGIBLE_MESSAGES = new Set([
  "Student profile not found in this university",
]);
const DIFFERENT_PROGRAM_MESSAGES = new Set([
  "Student is enrolled in a different academic program",
  "Cannot move a student to a group in a different academic program",
]);
const GROUP_ARCHIVED_MESSAGES = new Set([
  "Cannot add a student to an archived academic group",
  "Cannot move a student into an archived academic group",
]);
const GROUP_INACTIVE_MESSAGES = new Set([
  "Cannot add a student to an inactive academic group",
  "Cannot move a student into an inactive academic group",
]);
const PRIMARY_CONFLICT_MESSAGES = new Set([
  "Student already has an active primary membership in another group",
]);

function mapMembershipError(error: { code?: string; message?: string }): NonNullable<StudentGroupMembershipActionState["reason"]> {
  if (error.code === "23505") return "duplicate";
  if (error.code === "42501") return "forbidden";
  if (error.code === "22023") {
    const message = error.message ?? "";
    if (STUDENT_NOT_ELIGIBLE_MESSAGES.has(message)) return "studentNotEligible";
    if (DIFFERENT_PROGRAM_MESSAGES.has(message)) return "differentProgram";
    if (GROUP_ARCHIVED_MESSAGES.has(message)) return "groupArchived";
    if (GROUP_INACTIVE_MESSAGES.has(message)) return "groupInactive";
    if (PRIMARY_CONFLICT_MESSAGES.has(message)) return "primaryConflict";
    return "invalid";
  }
  return "unavailable";
}

export async function mutateStudentGroupMembership(formData: FormData): Promise<StudentGroupMembershipActionState> {
  const intent = safeFormValue(formData, "intent");
  const parsed = membershipMutationSchema.safeParse({
    intent,
    target_university_id: safeFormValue(formData, "target_university_id"),
    target_group_id: safeFormValue(formData, "target_group_id"),
    student_profile_id: safeFormValue(formData, "student_profile_id"),
    is_primary: safeFormValue(formData, "is_primary") || "false",
    membership_id: safeFormValue(formData, "membership_id"),
  });

  if (!parsed.success) return { status: "error", reason: "invalid" };

  const [activeProfile, supabase] = await Promise.all([
    getActiveProfile(),
    createServerSupabaseClient(),
  ]);
  if (!activeProfile || !supabase) return { status: "error", reason: "unavailable" };

  const input = parsed.data;
  let result;
  switch (input.intent) {
    case "add":
      result = await supabase.rpc("add_student_to_group", {
        requested_profile_id: activeProfile.id,
        target_university_id: input.target_university_id,
        target_group_id: input.target_group_id,
        student_profile_id: input.student_profile_id,
        is_primary: input.is_primary,
      });
      break;
    case "move":
      result = await supabase.rpc("move_student_group_membership", {
        requested_profile_id: activeProfile.id,
        membership_id: input.membership_id,
        target_group_id: input.target_group_id,
      });
      break;
    case "end":
      result = await supabase.rpc("end_student_group_membership", {
        requested_profile_id: activeProfile.id,
        membership_id: input.membership_id,
      });
      break;
    case "setPrimary":
      result = await supabase.rpc("set_primary_group_membership", {
        requested_profile_id: activeProfile.id,
        membership_id: input.membership_id,
      });
      break;
  }

  if (!result.error) return { status: "success", intent: input.intent };
  return { status: "error", intent: input.intent, reason: mapMembershipError(result.error) };
}
