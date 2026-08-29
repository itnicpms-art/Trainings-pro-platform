import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TableRow } from "@/types/database";

export type UserProfile = TableRow<"profiles"> & {
  organizationName: string | null;
};

export async function getUserProfiles(): Promise<UserProfile[]> {
  const [supabase, user] = await Promise.all([createServerSupabaseClient(), getCurrentUser()]);
  if (!supabase || !user) return [];

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error || !profiles) return [];

  const organizationIds = [...new Set(profiles.map((profile) => profile.organization_id).filter((id): id is string => Boolean(id)))];
  const organizationNames = new Map<string, string>();

  if (organizationIds.length) {
    const { data: organizations } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", organizationIds);

    organizations?.forEach((organization) => organizationNames.set(organization.id, organization.name));
  }

  return profiles.map((profile) => ({
    ...profile,
    organizationName: profile.organization_id ? organizationNames.get(profile.organization_id) ?? null : null,
  }));
}
