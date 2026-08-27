export type ProfileType =
  | "individual"
  | "student"
  | "instructor"
  | "professor"
  | "consultant"
  | "coordinator"
  | "organization_admin"
  | "university_admin"
  | "platform_admin";

export type OrganizationType = "university" | "company" | "training_provider" | "partner";
export type PermissionScope = "platform" | "organization" | "university" | "program" | "course" | "own";
export type EntityStatus = "active" | "inactive" | "suspended" | "archived";

export type ActiveProfile = {
  id: string;
  displayName: string;
  profileType: ProfileType;
  organizationId: string | null;
  isDefault: boolean;
};
