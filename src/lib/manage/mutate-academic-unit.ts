import "server-only";

import { z } from "zod";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const optionalUuid = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.uuid().nullable(),
);

const commonFields = {
  target_university_id: z.uuid(),
  parent_unit_id: optionalUuid,
  code: z.string().trim().max(100),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000),
  status: z.enum(["active", "inactive", "archived"]),
};

const academicUnitMutationSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("create"), unit_type: z.enum(["faculty", "department"]), ...commonFields }),
  z.object({ intent: z.literal("update"), unit_id: z.uuid(), ...commonFields }),
]);

export type AcademicUnitActionState = {
  status: "idle" | "success" | "error";
  intent?: "create" | "update";
  reason?: "invalid" | "duplicate" | "forbidden" | "unavailable";
};

export const initialAcademicUnitActionState: AcademicUnitActionState = { status: "idle" };

function safeFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function mutateAcademicUnit(formData: FormData): Promise<AcademicUnitActionState> {
  const intent = safeFormValue(formData, "intent");
  const parsed = academicUnitMutationSchema.safeParse({
    intent,
    target_university_id: safeFormValue(formData, "target_university_id"),
    parent_unit_id: safeFormValue(formData, "parent_unit_id"),
    unit_type: safeFormValue(formData, "unit_type"),
    unit_id: safeFormValue(formData, "unit_id"),
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
    ? await supabase.rpc("create_academic_unit", {
        requested_profile_id: activeProfile.id,
        target_university_id: input.target_university_id,
        parent_unit_id: input.parent_unit_id,
        unit_type: input.unit_type,
        code: input.code,
        name: input.name,
        description: input.description || null,
        status: input.status,
      })
    : await supabase.rpc("update_academic_unit", {
        requested_profile_id: activeProfile.id,
        unit_id: input.unit_id,
        parent_unit_id: input.parent_unit_id,
        code: input.code,
        name: input.name,
        description: input.description || null,
        status: input.status,
      });

  if (!result.error) return { status: "success", intent: input.intent };
  if (result.error.code === "23505") return { status: "error", intent: input.intent, reason: "duplicate" };
  if (result.error.code === "42501") return { status: "error", intent: input.intent, reason: "forbidden" };
  return { status: "error", intent: input.intent, reason: "unavailable" };
}
