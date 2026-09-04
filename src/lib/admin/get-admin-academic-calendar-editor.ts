import "server-only";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { getAcademicCalendarEditor } from "@/lib/manage/get-academic-calendar-editor";
import { hasPermission } from "@/lib/permissions/has-permission";
import { hasRole } from "@/lib/permissions/has-role";
import type { AcademicCalendarEditorOverview } from "@/types/database";

export async function getAdminAcademicCalendarEditor(
  targetUniversityId: string | null,
): Promise<AcademicCalendarEditorOverview | null> {
  const activeProfile = await getActiveProfile();
  if (!activeProfile) return null;

  const [isPlatformAdmin, canAccessAdmin] = await Promise.all([
    hasRole(activeProfile.id, "platform_admin", { scopeType: "platform", scopeId: null }),
    hasPermission(activeProfile.id, "admin.access", { scopeType: "platform", scopeId: null }),
  ]);

  if (!isPlatformAdmin || !canAccessAdmin) return null;
  return getAcademicCalendarEditor(activeProfile.id, targetUniversityId);
}
