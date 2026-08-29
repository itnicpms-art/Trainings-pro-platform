export type ProfileType =
  | "individual"
  | "individual_learner"
  | "organization_learner"
  | "student"
  | "instructor"
  | "professor"
  | "consultant"
  | "coordinator"
  | "organization_representative"
  | "organization_admin"
  | "university_admin"
  | "platform_admin";

export type OrganizationType = "university" | "company" | "training_provider" | "partner";
export type PermissionScope = "platform" | "organization" | "university" | "program" | "course" | "own";
export type EntityStatus = "active" | "inactive" | "suspended" | "archived";
export type ProfileStatus = EntityStatus | "pending_email_confirmation" | "pending_organization_approval" | "pending_review";
export type OnboardingFlow = "individual" | "invitation" | "representative";

export type ActiveProfile = {
  id: string;
  displayName: string;
  profileType: ProfileType;
  organizationId: string | null;
  isDefault: boolean;
  status: ProfileStatus;
};
