import "server-only";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { getAcademicProgramStaffAssignmentsEditor } from "@/lib/manage/get-academic-program-staff-assignments-editor";
import { hasPermission } from "@/lib/permissions/has-permission";
import { hasRole } from "@/lib/permissions/has-role";
import type { AcademicProgramStaffAssignmentsEditorOverview } from "@/types/database";

export async function getAdminAcademicProgramStaffAssignmentsEditor(
  targetUniversityId: string | null,
): Promise<AcademicProgramStaffAssignmentsEditorOverview | null> {
  const activeProfile = await getActiveProfile();
  if (!activeProfile) return null;

  const [isPlatformAdmin, canAccessAdmin] = await Promise.all([
    hasRole(activeProfile.id, "platform_admin", { scopeType: "platform", scopeId: null }),
    hasPermission(activeProfile.id, "admin.access", { scopeType: "platform", scopeId: null }),
  ]);

  if (!isPlatformAdmin || !canAccessAdmin) return null;
  return getAcademicProgramStaffAssignmentsEditor(activeProfile.id, targetUniversityId);
}
