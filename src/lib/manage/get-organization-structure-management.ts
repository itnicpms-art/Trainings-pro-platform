import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OrganizationStructureManagementOverview } from "@/types/database";

export async function getOrganizationStructureManagement(profileId: string): Promise<OrganizationStructureManagementOverview | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_organization_structure_management_overview", {
    requested_profile_id: profileId,
  });

  return error ? null : data;
}
