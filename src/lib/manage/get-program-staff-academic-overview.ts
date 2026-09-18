import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProgramStaffAcademicOverview } from "@/types/database";

export async function getProgramStaffAcademicOverview(
  profileId: string,
  targetAcademicProgramId: string,
): Promise<ProgramStaffAcademicOverview | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_program_staff_academic_overview", {
    requested_profile_id: profileId,
    target_academic_program_id: targetAcademicProgramId,
  });

  return error ? null : data;
}
