import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AcademicUnitsEditorOverview } from "@/types/database";

export async function getAcademicUnitsEditor(
  profileId: string,
  targetUniversityId: string | null = null,
): Promise<AcademicUnitsEditorOverview | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_academic_units_editor_overview", {
    requested_profile_id: profileId,
    target_university_id: targetUniversityId,
  });

  return error ? null : data;
}
