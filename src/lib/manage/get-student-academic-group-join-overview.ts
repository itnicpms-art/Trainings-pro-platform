import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { StudentAcademicGroupJoinOverview } from "@/types/database";

export async function getStudentAcademicGroupJoinOverview(profileId: string): Promise<StudentAcademicGroupJoinOverview | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_student_academic_group_join_overview", {
    requested_profile_id: profileId,
  });

  return error ? null : data;
}
