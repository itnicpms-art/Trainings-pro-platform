import "server-only";

import { z } from "zod";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const optionalUuid = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.uuid().nullable(),
);

const commonFields = {
  academic_program_id: z.uuid(),
  academic_year_id: optionalUuid,
  academic_term_id: optionalUuid,
  code: z.string().trim().max(100),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000),
  status: z.enum(["active", "inactive", "archived"]),
};

const academicGroupMutationSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("create"), target_university_id: z.uuid(), ...commonFields }),
  z.object({ intent: z.literal("update"), group_id: z.uuid(), ...commonFields }),
]);

export type AcademicGroupActionState = {
  status: "idle" | "success" | "error";
  intent?: "create" | "update";
  reason?: "invalid" | "duplicate" | "forbidden" | "unavailable" | "archivedParent" | "inactiveParent" | "invalidTermYear";
};

export const initialAcademicGroupActionState: AcademicGroupActionState = { status: "idle" };

function safeFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// create_academic_group/update_academic_group (migration 011) raise every
// business-rule violation with errcode 22023, distinguished only by message
// text. These strings are authored in that migration and are matched
// verbatim here instead of widening the RPC's error surface with new
// SQLSTATEs — see the TASK 004.4 fix this mirrors.
const TERM_YEAR_MESSAGES = new Set([
  "Academic term requires an academic year",
  "Academic term must belong to the selected academic year",
]);
const ARCHIVED_PARENT_MESSAGES = new Set([
  "Academic group cannot be created under an archived academic program",
  "Academic group cannot be created for an archived academic year",
  "Academic group cannot be created for an archived academic term",
  "Academic group cannot be moved under or reactivated within an archived academic program",
  "Academic group cannot be moved under or reactivated within an archived academic year",
  "Academic group cannot be moved under or reactivated within an archived academic term",
]);
const INACTIVE_PARENT_MESSAGES = new Set([
  "Active academic group requires an active academic program",
  "Active academic group requires an active academic year",
  "Active academic group requires an active academic term",
]);

function mapAcademicGroupError(error: { code?: string; message?: string }): NonNullable<AcademicGroupActionState["reason"]> {
  if (error.code === "23505") return "duplicate";
  if (error.code === "42501") return "forbidden";
  if (error.code === "22023") {
    const message = error.message ?? "";
    if (TERM_YEAR_MESSAGES.has(message)) return "invalidTermYear";
    if (ARCHIVED_PARENT_MESSAGES.has(message)) return "archivedParent";
    if (INACTIVE_PARENT_MESSAGES.has(message)) return "inactiveParent";
    return "invalid";
  }
  return "unavailable";
}

export async function mutateAcademicGroup(formData: FormData): Promise<AcademicGroupActionState> {
  const intent = safeFormValue(formData, "intent");
  const parsed = academicGroupMutationSchema.safeParse({
    intent,
    target_university_id: safeFormValue(formData, "target_university_id"),
    group_id: safeFormValue(formData, "group_id"),
    academic_program_id: safeFormValue(formData, "academic_program_id"),
    academic_year_id: safeFormValue(formData, "academic_year_id"),
    academic_term_id: safeFormValue(formData, "academic_term_id"),
    code: safeFormValue(formData, "code"),
    name: safeFormValue(formData, "name"),
    description: safeFormValue(formData, "description"),
    status: safeFormValue(formData, "status"),
  });

  if (!parsed.success) return { status: "error", reason: "invalid" };

  const [activeProfile, supabase] = await Promise.all([
    getActiveProfile(),
    createServerSupabaseClient(),
  ]);
  if (!activeProfile || !supabase) return { status: "error", reason: "unavailable" };

  const input = parsed.data;
  const result = input.intent === "create"
    ? await supabase.rpc("create_academic_group", {
        requested_profile_id: activeProfile.id,
        target_university_id: input.target_university_id,
        target_academic_program_id: input.academic_program_id,
        target_academic_year_id: input.academic_year_id,
        target_academic_term_id: input.academic_term_id,
        code: input.code,
        name: input.name,
        description: input.description || null,
        status: input.status,
      })
    : await supabase.rpc("update_academic_group", {
        requested_profile_id: activeProfile.id,
        group_id: input.group_id,
        target_academic_program_id: input.academic_program_id,
        target_academic_year_id: input.academic_year_id,
        target_academic_term_id: input.academic_term_id,
        code: input.code,
        name: input.name,
        description: input.description || null,
        status: input.status,
      });

  if (!result.error) return { status: "success", intent: input.intent };
  return { status: "error", intent: input.intent, reason: mapAcademicGroupError(result.error) };
}
