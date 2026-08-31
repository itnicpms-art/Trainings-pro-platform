import { cache } from "react";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { getUserProfiles } from "@/lib/auth/get-user-profiles";
import {
  deriveDashboardVariant,
  getScopedActiveProfileCount,
  getScopedOrganizationCount,
  shouldShowDashboardOrganization,
} from "@/lib/dashboard/dashboard-config";
import { getHomeContexts } from "@/lib/dashboard/get-home-contexts";
import { getProfileRoles } from "@/lib/permissions/get-profile-roles";
import { hasPermission } from "@/lib/permissions/has-permission";

export const getDashboardContext = cache(async () => {
  const [profiles, activeProfile] = await Promise.all([getUserProfiles(), getActiveProfile()]);
  const activeProfiles = profiles.filter((profile) => profile.status === "active");

  if (!activeProfile) {
    return {
      profiles,
      activeProfile: null,
      roles: [],
      roleCodes: new Set<string>(),
      canAccessPlatformAdmin: false,
      variant: null,
      activeProfileCount: 0,
      organizationCount: 0,
      showOrganizationContext: false,
      showAcademicContext: false,
      showTrainingContext: false,
      academicContext: null,
      trainingContext: null,
    };
  }

  const [roles, canAccessPlatformAdmin] = await Promise.all([
    getProfileRoles(activeProfile.id),
    hasPermission(activeProfile.id, "admin.access", { scopeType: "platform", scopeId: null }),
  ]);
  const roleCodes = new Set(roles.map((role) => role.code));
  const variant = deriveDashboardVariant(activeProfile, roleCodes, canAccessPlatformAdmin);
  const requestsAcademicContext = ["academicStudent", "professor", "coordinator", "universityAdmin"].includes(variant);
  const requestsTrainingContext = ["organizationLearner", "organizationRepresentative", "organizationAdmin"].includes(variant)
    || (variant === "individualLearner" && Boolean(activeProfile.organization_id));
  const { academicContext, trainingContext } = await getHomeContexts(activeProfile.id, {
    academic: requestsAcademicContext,
    training: requestsTrainingContext,
  });
  const showAcademicContext = variant === "academicStudent"
    || (requestsAcademicContext && Boolean(academicContext?.university_id || academicContext?.context_status));
  const showTrainingContext = ["organizationLearner", "organizationRepresentative", "organizationAdmin"].includes(variant)
    || (variant === "individualLearner" && Boolean(trainingContext?.organization_id));

  return {
    profiles,
    activeProfile,
    roles,
    roleCodes,
    canAccessPlatformAdmin,
    variant,
    activeProfileCount: getScopedActiveProfileCount(activeProfiles, activeProfile, variant),
    organizationCount: getScopedOrganizationCount(activeProfiles, activeProfile, variant),
    showOrganizationContext: shouldShowDashboardOrganization(variant, activeProfile.organization_id, activeProfile.university_id),
    showAcademicContext,
    showTrainingContext,
    academicContext,
    trainingContext,
  };
});
