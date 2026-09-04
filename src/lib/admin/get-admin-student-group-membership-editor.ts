import "server-only";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { getStudentGroupMembershipEditor } from "@/lib/manage/get-student-group-membership-editor";
import { hasPermission } from "@/lib/permissions/has-permission";
import { hasRole } from "@/lib/permissions/has-role";
import type { StudentGroupMembershipEditorOverview } from "@/types/database";

export async function getAdminStudentGroupMembershipEditor(
  targetUniversityId: string | null,
): Promise<StudentGroupMembershipEditorOverview | null> {
  const activeProfile = await getActiveProfile();
  if (!activeProfile) return null;

  const [isPlatformAdmin, canAccessAdmin] = await Promise.all([
    hasRole(activeProfile.id, "platform_admin", { scopeType: "platform", scopeId: null }),
    hasPermission(activeProfile.id, "admin.access", { scopeType: "platform", scopeId: null }),
  ]);

  if (!isPlatformAdmin || !canAccessAdmin) return null;
  return getStudentGroupMembershipEditor(activeProfile.id, targetUniversityId);
}
