import type { Session } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  return error ? null : data.session;
}
