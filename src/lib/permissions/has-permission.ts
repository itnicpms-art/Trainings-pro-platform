import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PermissionScope } from "@/types/app";

type PermissionContext = { scopeType?: PermissionScope; scopeId?: string | null };

export async function hasPermission(profileId: string, permissionCode: string, context: PermissionContext = {}): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return false;

  let rolesQuery = supabase.from("profile_roles").select("role_id, scope_type, scope_id").eq("profile_id", profileId);
  if (context.scopeType) rolesQuery = rolesQuery.eq("scope_type", context.scopeType);
  if (context.scopeId) rolesQuery = rolesQuery.eq("scope_id", context.scopeId);

  const { data: profileRoles, error: rolesError } = await rolesQuery;
  if (rolesError || !profileRoles?.length) return false;

  const { data: permission, error: permissionError } = await supabase
    .from("permissions")
    .select("id")
    .eq("code", permissionCode)
    .maybeSingle();
  if (permissionError || !permission) return false;

  const roleIds = profileRoles.map((role) => role.role_id);
  const { data: grant } = await supabase
    .from("role_permissions")
    .select("allowed")
    .in("role_id", roleIds)
    .eq("permission_id", permission.id)
    .eq("allowed", true)
    .limit(1)
    .maybeSingle();

  return Boolean(grant?.allowed);
}
