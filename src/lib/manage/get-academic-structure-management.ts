import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AcademicStructureManagementOverview } from "@/types/database";

export async function getAcademicStructureManagement(profileId: string): Promise<AcademicStructureManagementOverview | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_academic_structure_management_overview", {
    requested_profile_id: profileId,
  });

  return error ? null : data;
}
