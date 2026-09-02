import "server-only";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { getAcademicUnitsEditor } from "@/lib/manage/get-academic-units-editor";
import { hasPermission } from "@/lib/permissions/has-permission";
import { hasRole } from "@/lib/permissions/has-role";
import type { AcademicUnitsEditorOverview } from "@/types/database";

export async function getAdminAcademicUnitsEditor(
  targetUniversityId: string | null,
): Promise<AcademicUnitsEditorOverview | null> {
  const activeProfile = await getActiveProfile();
  if (!activeProfile) return null;

  const [isPlatformAdmin, canAccessAdmin] = await Promise.all([
    hasRole(activeProfile.id, "platform_admin", { scopeType: "platform", scopeId: null }),
    hasPermission(activeProfile.id, "admin.access", { scopeType: "platform", scopeId: null }),
  ]);

  if (!isPlatformAdmin || !canAccessAdmin) return null;
  return getAcademicUnitsEditor(activeProfile.id, targetUniversityId);
}
