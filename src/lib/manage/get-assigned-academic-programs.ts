import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AssignedAcademicProgram } from "@/types/database";

export async function getAssignedAcademicPrograms(profileId: string): Promise<AssignedAcademicProgram[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_assigned_academic_programs", {
    requested_profile_id: profileId,
  });

  return error || !data ? [] : data;
}
