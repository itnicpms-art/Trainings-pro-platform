import { cache } from "react";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { getUserProfiles } from "@/lib/auth/get-user-profiles";
import { deriveDashboardVariant } from "@/lib/dashboard/dashboard-config";
import { getProfileRoles } from "@/lib/permissions/get-profile-roles";
import { hasPermission } from "@/lib/permissions/has-permission";

export const getDashboardContext = cache(async () => {
  const [profiles, activeProfile] = await Promise.all([getUserProfiles(), getActiveProfile()]);
  const activeProfiles = profiles.filter((profile) => profile.status === "active");
  const organizationCount = new Set(activeProfiles.map((profile) => profile.organization_id).filter(Boolean)).size;

  if (!activeProfile) {
    return {
      profiles,
      activeProfile: null,
      roles: [],
      roleCodes: new Set<string>(),
      canAccessPlatformAdmin: false,
      variant: null,
      activeProfileCount: activeProfiles.length,
      organizationCount,
      hasAcademicContext: false,
    };
  }

  const [roles, canAccessPlatformAdmin] = await Promise.all([
    getProfileRoles(activeProfile.id),
    hasPermission(activeProfile.id, "admin.access", { scopeType: "platform", scopeId: null }),
  ]);
  const roleCodes = new Set(roles.map((role) => role.code));

  return {
    profiles,
    activeProfile,
    roles,
    roleCodes,
    canAccessPlatformAdmin,
    variant: deriveDashboardVariant(activeProfile, roleCodes, canAccessPlatformAdmin),
    activeProfileCount: activeProfiles.length,
    organizationCount,
    hasAcademicContext: Boolean(activeProfile.university_id || activeProfile.academic_program_id || activeProfile.group_id),
  };
});
