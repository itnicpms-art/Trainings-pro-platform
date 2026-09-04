import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AcademicProgramsEditorOverview } from "@/types/database";

export async function getAcademicProgramsEditor(
  profileId: string,
  targetUniversityId: string | null = null,
): Promise<AcademicProgramsEditorOverview | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_academic_programs_editor_overview", {
    requested_profile_id: profileId,
    target_university_id: targetUniversityId,
  });

  return error ? null : data;
}
