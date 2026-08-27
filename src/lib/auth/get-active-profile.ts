import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TableRow } from "@/types/database";

export async function getActiveProfile(): Promise<TableRow<"profiles"> | null> {
  const [supabase, user] = await Promise.all([createServerSupabaseClient(), getCurrentUser()]);
  if (!supabase || !user) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).eq("status", "active").order("is_default", { ascending: false }).limit(1).maybeSingle();
  return error ? null : data;
}
