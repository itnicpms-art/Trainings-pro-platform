import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AcademicProgramStaffAssignmentsEditorOverview } from "@/types/database";

export async function getAcademicProgramStaffAssignmentsEditor(
  profileId: string,
  targetUniversityId: string | null = null,
): Promise<AcademicProgramStaffAssignmentsEditorOverview | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_academic_program_staff_assignments_editor_overview", {
    requested_profile_id: profileId,
    target_university_id: targetUniversityId,
  });

  return error ? null : data;
}
