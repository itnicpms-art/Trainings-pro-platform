import "server-only";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { getAcademicGroupsEditor } from "@/lib/manage/get-academic-groups-editor";
import { hasPermission } from "@/lib/permissions/has-permission";
import { hasRole } from "@/lib/permissions/has-role";
import type { AcademicGroupsEditorOverview } from "@/types/database";

export async function getAdminAcademicGroupsEditor(
  targetUniversityId: string | null,
): Promise<AcademicGroupsEditorOverview | null> {
  const activeProfile = await getActiveProfile();
  if (!activeProfile) return null;

  const [isPlatformAdmin, canAccessAdmin] = await Promise.all([
    hasRole(activeProfile.id, "platform_admin", { scopeType: "platform", scopeId: null }),
    hasPermission(activeProfile.id, "admin.access", { scopeType: "platform", scopeId: null }),
  ]);

  if (!isPlatformAdmin || !canAccessAdmin) return null;
  return getAcademicGroupsEditor(activeProfile.id, targetUniversityId);
}
