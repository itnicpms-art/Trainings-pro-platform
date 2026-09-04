import "server-only";

import { z } from "zod";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const commonFields = {
  organization_unit_id: z.uuid(),
  code: z.string().trim().max(100),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000),
  program_level: z.enum(["bachelor", "master", "phd", "postgraduate", "other"]),
  status: z.enum(["active", "inactive", "archived"]),
};

const academicProgramMutationSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("create"), target_university_id: z.uuid(), ...commonFields }),
  z.object({ intent: z.literal("update"), program_id: z.uuid(), ...commonFields }),
]);

export type AcademicProgramActionState = {
  status: "idle" | "success" | "error";
  intent?: "create" | "update";
  reason?: "invalid" | "duplicate" | "forbidden" | "unavailable";
};

export const initialAcademicProgramActionState: AcademicProgramActionState = { status: "idle" };

function safeFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function mutateAcademicProgram(formData: FormData): Promise<AcademicProgramActionState> {
  const intent = safeFormValue(formData, "intent");
  const parsed = academicProgramMutationSchema.safeParse({
    intent,
    target_university_id: safeFormValue(formData, "target_university_id"),
    program_id: safeFormValue(formData, "program_id"),
    organization_unit_id: safeFormValue(formData, "organization_unit_id"),
    code: safeFormValue(formData, "code"),
    name: safeFormValue(formData, "name"),
    description: safeFormValue(formData, "description"),
    program_level: safeFormValue(formData, "program_level"),
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
    ? await supabase.rpc("create_academic_program", {
        requested_profile_id: activeProfile.id,
        target_university_id: input.target_university_id,
        target_organization_unit_id: input.organization_unit_id,
        code: input.code,
        name: input.name,
        description: input.description || null,
        program_level: input.program_level,
        status: input.status,
      })
    : await supabase.rpc("update_academic_program", {
        requested_profile_id: activeProfile.id,
        program_id: input.program_id,
        target_organization_unit_id: input.organization_unit_id,
        code: input.code,
        name: input.name,
        description: input.description || null,
        program_level: input.program_level,
        status: input.status,
      });

  if (!result.error) return { status: "success", intent: input.intent };
  if (result.error.code === "23505") return { status: "error", intent: input.intent, reason: "duplicate" };
  if (result.error.code === "42501") return { status: "error", intent: input.intent, reason: "forbidden" };
  return { status: "error", intent: input.intent, reason: "unavailable" };
}
