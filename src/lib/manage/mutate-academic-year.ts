import "server-only";

import { z } from "zod";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const commonFields = {
  code: z.string().trim().max(100),
  name: z.string().trim().min(1).max(200),
  start_date: z.iso.date(),
  end_date: z.iso.date(),
  status: z.enum(["active", "inactive", "archived"]),
};

const academicYearMutationSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("create"), target_university_id: z.uuid(), ...commonFields }),
  z.object({ intent: z.literal("update"), year_id: z.uuid(), ...commonFields }),
]);

export type AcademicYearActionState = {
  status: "idle" | "success" | "error";
  intent?: "create" | "update";
  reason?: "invalid" | "duplicate" | "forbidden" | "unavailable";
};

export const initialAcademicYearActionState: AcademicYearActionState = { status: "idle" };

function safeFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function mutateAcademicYear(formData: FormData): Promise<AcademicYearActionState> {
  const intent = safeFormValue(formData, "intent");
  const parsed = academicYearMutationSchema.safeParse({
    intent,
    target_university_id: safeFormValue(formData, "target_university_id"),
    year_id: safeFormValue(formData, "year_id"),
    code: safeFormValue(formData, "code"),
    name: safeFormValue(formData, "name"),
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
    ? await supabase.rpc("create_academic_year", {
        requested_profile_id: activeProfile.id,
        target_university_id: input.target_university_id,
        code: input.code,
        name: input.name,
        start_date: input.start_date,
        end_date: input.end_date,
        status: input.status,
      })
    : await supabase.rpc("update_academic_year", {
        requested_profile_id: activeProfile.id,
        year_id: input.year_id,
        code: input.code,
        name: input.name,
        start_date: input.start_date,
        end_date: input.end_date,
        status: input.status,
      });

  if (!result.error) return { status: "success", intent: input.intent };
  if (result.error.code === "23505") return { status: "error", intent: input.intent, reason: "duplicate" };
  if (result.error.code === "42501") return { status: "error", intent: input.intent, reason: "forbidden" };
  return { status: "error", intent: input.intent, reason: "unavailable" };
}
