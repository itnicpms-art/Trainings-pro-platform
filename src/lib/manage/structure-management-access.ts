const academicManagementRoles = new Set(["university_admin", "professor", "program_coordinator", "coordinator"]);
const organizationManagementRoles = new Set(["organization_admin", "organization_representative"]);
// TASK 004.6.1: professor/program_coordinator authorize actual data access
// exclusively through real profile_roles(scope_type='program') rows (see
// resolve_academic_program_editor_mode, migration 016) -- roleCodes reflects
// those real rows, not profile_type, so once every such assignment is
// revoked, roleCodes no longer contains 'professor'/'program_coordinator'
// at all. Without this fallback, that profile would be routed to the
// generic "restricted" screen instead of the specific "no assigned
// programs" empty state its own page renders. This set exists ONLY to keep
// the route/shell reachable in that case and grants no data by itself --
// every RPC still authorizes independently against real profile_roles rows
// regardless of profile_type, and no fake/null-scope role row is ever
// created to compensate.
const academicStaffProfileTypes = new Set(["professor", "coordinator"]);

export function canAccessAcademicStructureManagement(
  roleCodes: ReadonlySet<string>,
  universityId: string | null | undefined,
  profileType?: string | null,
) {
  if (!universityId) return false;
  if ([...roleCodes].some((roleCode) => academicManagementRoles.has(roleCode))) return true;
  return Boolean(profileType && academicStaffProfileTypes.has(profileType));
}

export function canAccessOrganizationStructureManagement(roleCodes: ReadonlySet<string>, organizationId: string | null | undefined) {
  return Boolean(organizationId) && [...roleCodes].some((roleCode) => organizationManagementRoles.has(roleCode));
}
