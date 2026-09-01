const academicManagementRoles = new Set(["university_admin", "professor", "program_coordinator", "coordinator"]);
const organizationManagementRoles = new Set(["organization_admin", "organization_representative"]);

export function canAccessAcademicStructureManagement(roleCodes: ReadonlySet<string>, universityId: string | null | undefined) {
  return Boolean(universityId) && [...roleCodes].some((roleCode) => academicManagementRoles.has(roleCode));
}

export function canAccessOrganizationStructureManagement(roleCodes: ReadonlySet<string>, organizationId: string | null | undefined) {
  return Boolean(organizationId) && [...roleCodes].some((roleCode) => organizationManagementRoles.has(roleCode));
}
