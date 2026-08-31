import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type HomeAcademicContext = Database["public"]["Functions"]["get_home_academic_context"]["Returns"][number];
export type HomeTrainingContext = Database["public"]["Functions"]["get_home_training_context"]["Returns"][number];

export async function getHomeContexts(
  profileId: string,
  options: { academic: boolean; training: boolean },
): Promise<{ academicContext: HomeAcademicContext | null; trainingContext: HomeTrainingContext | null }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { academicContext: null, trainingContext: null };

  const [academicResult, trainingResult] = await Promise.all([
    options.academic
      ? supabase.rpc("get_home_academic_context", { requested_profile_id: profileId })
      : Promise.resolve(null),
    options.training
      ? supabase.rpc("get_home_training_context", { requested_profile_id: profileId })
      : Promise.resolve(null),
  ]);

  return {
    academicContext: academicResult && !academicResult.error ? academicResult.data?.[0] ?? null : null,
    trainingContext: trainingResult && !trainingResult.error ? trainingResult.data?.[0] ?? null : null,
  };
}
