import type { User } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}
