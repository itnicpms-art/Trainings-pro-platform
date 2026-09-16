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

const PROGRAM_STAFF_ROLE_CODES = new Set(["professor", "program_coordinator"]);

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
  const { academicContext: rawAcademicContext, trainingContext } = await getHomeContexts(activeProfile.id, {
    academic: requestsAcademicContext,
    training: requestsTrainingContext,
  });
  // PROGRAM ASSIGNMENT CONTROLS AUTHORIZATION (TASK 004.6.1): for a
  // professor/program_coordinator, academic_profile_contexts (migration
  // 005's get_home_academic_context) is a display convenience only, never
  // an authorization source, and it does not check profile_roles. It can
  // point at a program the profile no longer holds (or never held) a real
  // professor/program_coordinator profile_roles row for -- e.g. once their
  // last assignment is revoked -- so Home must not surface it unless it
  // still names a program the profile is currently assigned to.
  const staffAuthorizedProgramIds = new Set(
    roles
      .filter((role) => PROGRAM_STAFF_ROLE_CODES.has(role.code) && role.scopeType === "program" && role.scopeId)
      .map((role) => role.scopeId as string),
  );
  const academicContext = (variant === "professor" || variant === "coordinator")
    ? (rawAcademicContext?.academic_program_id && staffAuthorizedProgramIds.has(rawAcademicContext.academic_program_id)
        ? rawAcademicContext
        : null)
    : rawAcademicContext;
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
