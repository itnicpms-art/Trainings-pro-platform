import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PermissionScope } from "@/types/app";

export type ProfileRole = {
  id: string;
  code: string;
  name: string;
  roleScope: PermissionScope;
  scopeType: PermissionScope;
  scopeId: string | null;
};

export async function getProfileRoles(profileId: string): Promise<ProfileRole[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data: assignments, error } = await supabase
    .from("profile_roles")
    .select("role_id, scope_type, scope_id")
    .eq("profile_id", profileId);

  if (error || !assignments?.length) return [];

  const roleIds = [...new Set(assignments.map((assignment) => assignment.role_id))];
  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("id, code, name, scope")
    .in("id", roleIds);

  if (rolesError || !roles) return [];

  const rolesById = new Map(roles.map((role) => [role.id, role]));
  return assignments.flatMap((assignment) => {
    const role = rolesById.get(assignment.role_id);
    if (!role) return [];

    return [{
      id: role.id,
      code: role.code,
      name: role.name,
      roleScope: role.scope,
      scopeType: assignment.scope_type,
      scopeId: assignment.scope_id,
    }];
  });
}
