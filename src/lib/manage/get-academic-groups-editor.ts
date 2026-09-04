import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AcademicGroupsEditorOverview } from "@/types/database";

export async function getAcademicGroupsEditor(
  profileId: string,
  targetUniversityId: string | null = null,
): Promise<AcademicGroupsEditorOverview | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_academic_groups_editor_overview", {
    requested_profile_id: profileId,
    target_university_id: targetUniversityId,
  });

  return error ? null : data;
}
