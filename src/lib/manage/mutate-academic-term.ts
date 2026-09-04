import "server-only";

import { z } from "zod";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const commonFields = {
  academic_year_id: z.uuid(),
  code: z.string().trim().max(100),
  name: z.string().trim().min(1).max(200),
  term_type: z.enum(["semester", "trimester", "module", "term", "other"]),
  start_date: z.iso.date(),
  end_date: z.iso.date(),
  status: z.enum(["active", "inactive", "archived"]),
};

const academicTermMutationSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("create"), target_university_id: z.uuid(), ...commonFields }),
  z.object({ intent: z.literal("update"), term_id: z.uuid(), ...commonFields }),
]);

export type AcademicTermActionState = {
  status: "idle" | "success" | "error";
  intent?: "create" | "update";
  reason?: "invalid" | "duplicate" | "forbidden" | "unavailable" | "dateRange" | "outsideYear" | "archivedParent" | "inactiveParent";
};

export const initialAcademicTermActionState: AcademicTermActionState = { status: "idle" };

function safeFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// create_academic_term/update_academic_term (migration 010) raise every business-rule
// violation with errcode 22023, distinguished only by message text. These strings are
// authored in that migration and are matched verbatim here instead of widening the
// RPC's error surface with new SQLSTATEs.
const DATE_RANGE_MESSAGES = new Set([
  "Academic term start date must be earlier than the end date",
]);
const OUTSIDE_YEAR_MESSAGES = new Set([
  "Academic term dates must stay within the academic year period",
]);
const ARCHIVED_PARENT_MESSAGES = new Set([
  "Academic term cannot be created under an archived academic year",
  "Academic term cannot be moved under or reactivated within an archived academic year",
]);
const INACTIVE_PARENT_MESSAGES = new Set([
  "Active academic term requires an active academic year",
]);

function mapAcademicTermError(error: { code?: string; message?: string }): NonNullable<AcademicTermActionState["reason"]> {
  if (error.code === "23505") return "duplicate";
  if (error.code === "42501") return "forbidden";
  if (error.code === "22023") {
    const message = error.message ?? "";
    if (DATE_RANGE_MESSAGES.has(message)) return "dateRange";
    if (OUTSIDE_YEAR_MESSAGES.has(message)) return "outsideYear";
    if (ARCHIVED_PARENT_MESSAGES.has(message)) return "archivedParent";
    if (INACTIVE_PARENT_MESSAGES.has(message)) return "inactiveParent";
    return "invalid";
  }
  return "unavailable";
}

export async function mutateAcademicTerm(formData: FormData): Promise<AcademicTermActionState> {
  const intent = safeFormValue(formData, "intent");
  const parsed = academicTermMutationSchema.safeParse({
    intent,
    target_university_id: safeFormValue(formData, "target_university_id"),
    term_id: safeFormValue(formData, "term_id"),
    academic_year_id: safeFormValue(formData, "academic_year_id"),
    code: safeFormValue(formData, "code"),
    name: safeFormValue(formData, "name"),
    term_type: safeFormValue(formData, "term_type"),
    start_date: safeFormValue(formData, "start_date"),
    end_date: safeFormValue(formData, "end_date"),
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
    ? await supabase.rpc("create_academic_term", {
        requested_profile_id: activeProfile.id,
        target_university_id: input.target_university_id,
        target_academic_year_id: input.academic_year_id,
        code: input.code,
        name: input.name,
        term_type: input.term_type,
        start_date: input.start_date,
        end_date: input.end_date,
        status: input.status,
      })
    : await supabase.rpc("update_academic_term", {
        requested_profile_id: activeProfile.id,
        term_id: input.term_id,
        target_academic_year_id: input.academic_year_id,
        code: input.code,
        name: input.name,
        term_type: input.term_type,
        start_date: input.start_date,
        end_date: input.end_date,
        status: input.status,
      });

  if (!result.error) return { status: "success", intent: input.intent };
  return { status: "error", intent: input.intent, reason: mapAcademicTermError(result.error) };
}
