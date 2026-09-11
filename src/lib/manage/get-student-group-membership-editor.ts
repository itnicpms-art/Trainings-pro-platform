import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { StudentGroupMembershipEditorOverview } from "@/types/database";

export async function getStudentGroupMembershipEditor(
  profileId: string,
  targetUniversityId: string | null = null,
): Promise<StudentGroupMembershipEditorOverview | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_student_group_membership_editor_overview", {
    requested_profile_id: profileId,
    target_university_id: targetUniversityId,
  });

  return error ? null : data;
}
