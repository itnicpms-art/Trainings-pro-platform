import "server-only";

import { z } from "zod";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const commonFields = {
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(160),
  org_type: z.enum(["university", "company", "training_provider", "partner"]),
  description: z.string().trim().max(2000),
  logo_url: z.string().trim().max(2000),
  website: z.string().trim().max(2000),
  status: z.enum(["active", "inactive", "suspended", "archived"]),
};

const organizationMutationSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("create"), ...commonFields }),
  z.object({ intent: z.literal("update"), organization_id: z.uuid(), ...commonFields }),
]);

export type OrganizationActionState = {
  status: "idle" | "success" | "error";
  intent?: "create" | "update";
  reason?: "invalid" | "duplicate" | "forbidden" | "unavailable";
};

export const initialOrganizationActionState: OrganizationActionState = { status: "idle" };

function safeFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function mutateAdminOrganization(formData: FormData): Promise<OrganizationActionState> {
  const intent = safeFormValue(formData, "intent");
  const parsed = organizationMutationSchema.safeParse({
    intent,
    organization_id: safeFormValue(formData, "organization_id"),
    name: safeFormValue(formData, "name"),
    slug: safeFormValue(formData, "slug"),
    org_type: safeFormValue(formData, "org_type"),
    description: safeFormValue(formData, "description"),
    logo_url: safeFormValue(formData, "logo_url"),
    website: safeFormValue(formData, "website"),
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
    ? await supabase.rpc("create_platform_admin_organization", {
        requested_profile_id: activeProfile.id,
        name: input.name,
        slug: input.slug || null,
        org_type: input.org_type,
        description: input.description || null,
        logo_url: input.logo_url || null,
        website: input.website || null,
        status: input.status,
      })
    : await supabase.rpc("update_platform_admin_organization", {
        requested_profile_id: activeProfile.id,
        organization_id: input.organization_id,
        name: input.name,
        slug: input.slug || null,
        org_type: input.org_type,
        description: input.description || null,
        logo_url: input.logo_url || null,
        website: input.website || null,
        status: input.status,
      });

  if (!result.error) return { status: "success", intent: input.intent };
  if (result.error.code === "23505") return { status: "error", intent: input.intent, reason: "duplicate" };
  if (result.error.code === "42501") return { status: "error", intent: input.intent, reason: "forbidden" };
  return { status: "error", intent: input.intent, reason: "unavailable" };
}
