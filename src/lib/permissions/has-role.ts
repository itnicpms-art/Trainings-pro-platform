import { getProfileRoles } from "@/lib/permissions/get-profile-roles";
import type { PermissionScope } from "@/types/app";

type RoleContext = {
  scopeType?: PermissionScope;
  scopeId?: string | null;
};

export async function hasRole(profileId: string, roleCode: string, context: RoleContext = {}): Promise<boolean> {
  const roles = await getProfileRoles(profileId);

  return roles.some((role) => {
    if (role.code !== roleCode) return false;
    if (context.scopeType && role.scopeType !== context.scopeType) return false;
    if (context.scopeId !== undefined && role.scopeId !== context.scopeId) return false;
    return true;
  });
}
