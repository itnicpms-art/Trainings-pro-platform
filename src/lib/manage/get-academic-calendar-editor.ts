import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AcademicCalendarEditorOverview } from "@/types/database";

export async function getAcademicCalendarEditor(
  profileId: string,
  targetUniversityId: string | null = null,
): Promise<AcademicCalendarEditorOverview | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_academic_calendar_editor_overview", {
    requested_profile_id: profileId,
    target_university_id: targetUniversityId,
  });

  return error ? null : data;
}
