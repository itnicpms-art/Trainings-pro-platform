import "server-only";

import { z } from "zod";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const academicGroupJoinRequestMutationSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("request"), target_academic_group_id: z.uuid(), student_note: z.string().optional() }),
  z.object({ intent: z.literal("cancel"), request_id: z.uuid() }),
  z.object({ intent: z.literal("approve"), request_id: z.uuid() }),
  z.object({ intent: z.literal("reject"), request_id: z.uuid(), decision_note: z.string().optional() }),
]);

export type AcademicGroupJoinRequestActionState = {
  status: "idle" | "success" | "error";
  intent?: "request" | "cancel" | "approve" | "reject";
  alreadyPending?: boolean;
  reason?: "invalid" | "forbidden" | "unavailable" | "notFound" | "notEligible"
    | "groupArchived" | "groupInactive" | "programInactive" | "duplicate" | "alreadyDecided" | "staleAssociation";
};

export const initialAcademicGroupJoinRequestActionState: AcademicGroupJoinRequestActionState = { status: "idle" };

function safeFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// request_academic_group_join/cancel_academic_group_join_request/
// approve_academic_group_join_request/reject_academic_group_join_request
// (migration 019) raise every business-rule violation with errcode 22023
// (or 23505 for the duplicate-membership case), distinguished only by
// message text -- the same approach already used throughout this codebase.
const NOT_FOUND_MESSAGES = new Set([
  "Academic group not found",
  "Academic group join request not found",
]);
const NOT_ELIGIBLE_MESSAGES = new Set([
  "Only a student profile can request a group join",
  "Academic group does not belong to the student's university",
  "Student does not have an active academic association with this program",
]);
const GROUP_ARCHIVED_MESSAGES = new Set(["Cannot request an archived academic group"]);
const GROUP_INACTIVE_MESSAGES = new Set([
  "Cannot request an inactive academic group",
  "Cannot approve a request for an inactive or archived academic group",
]);
const PROGRAM_INACTIVE_MESSAGES = new Set([
  "Cannot request a group in an inactive academic program",
  "Cannot approve a request for an inactive academic program",
]);
const ALREADY_DECIDED_MESSAGES = new Set([
  "Only a pending request can be cancelled",
  "Only a pending request can be approved",
  "Only a pending request can be rejected",
]);
const STALE_ASSOCIATION_MESSAGES = new Set([
  "Student no longer has an active academic association with this program",
  "Student profile is not active",
  "Academic group changed since the request was created",
]);

function mapJoinRequestError(error: { code?: string; message?: string }): NonNullable<AcademicGroupJoinRequestActionState["reason"]> {
  if (error.code === "23505") return "duplicate";
  if (error.code === "42501") return "forbidden";
  if (error.code === "22023") {
    const message = error.message ?? "";
    if (NOT_FOUND_MESSAGES.has(message)) return "notFound";
    if (NOT_ELIGIBLE_MESSAGES.has(message)) return "notEligible";
    if (GROUP_ARCHIVED_MESSAGES.has(message)) return "groupArchived";
    if (GROUP_INACTIVE_MESSAGES.has(message)) return "groupInactive";
    if (PROGRAM_INACTIVE_MESSAGES.has(message)) return "programInactive";
    if (ALREADY_DECIDED_MESSAGES.has(message)) return "alreadyDecided";
    if (STALE_ASSOCIATION_MESSAGES.has(message)) return "staleAssociation";
    return "invalid";
  }
  return "unavailable";
}

export async function mutateAcademicGroupJoinRequest(formData: FormData): Promise<AcademicGroupJoinRequestActionState> {
  const intent = safeFormValue(formData, "intent");
  const parsed = academicGroupJoinRequestMutationSchema.safeParse({
    intent,
    target_academic_group_id: safeFormValue(formData, "target_academic_group_id"),
    student_note: safeFormValue(formData, "student_note") || undefined,
    request_id: safeFormValue(formData, "request_id"),
    decision_note: safeFormValue(formData, "decision_note") || undefined,
  });

  if (!parsed.success) return { status: "error", reason: "invalid" };

  const [activeProfile, supabase] = await Promise.all([
    getActiveProfile(),
    createServerSupabaseClient(),
  ]);
  if (!activeProfile || !supabase) return { status: "error", reason: "unavailable" };

  const input = parsed.data;

  if (input.intent === "request") {
    const result = await supabase.rpc("request_academic_group_join", {
      requested_profile_id: activeProfile.id,
      target_academic_group_id: input.target_academic_group_id,
      student_note: input.student_note ?? null,
    });
    if (result.error) return { status: "error", intent: input.intent, reason: mapJoinRequestError(result.error) };
    return { status: "success", intent: input.intent, alreadyPending: result.data?.already_pending === true };
  }

  if (input.intent === "cancel") {
    const result = await supabase.rpc("cancel_academic_group_join_request", {
      requested_profile_id: activeProfile.id,
      request_id: input.request_id,
    });
    if (result.error) return { status: "error", intent: input.intent, reason: mapJoinRequestError(result.error) };
    return { status: "success", intent: input.intent };
  }

  if (input.intent === "approve") {
    const result = await supabase.rpc("approve_academic_group_join_request", {
      requested_profile_id: activeProfile.id,
      request_id: input.request_id,
    });
    if (result.error) return { status: "error", intent: input.intent, reason: mapJoinRequestError(result.error) };
    return { status: "success", intent: input.intent };
  }

  const result = await supabase.rpc("reject_academic_group_join_request", {
    requested_profile_id: activeProfile.id,
    request_id: input.request_id,
    decision_note: input.decision_note ?? null,
  });
  if (result.error) return { status: "error", intent: input.intent, reason: mapJoinRequestError(result.error) };
  return { status: "success", intent: input.intent };
}
