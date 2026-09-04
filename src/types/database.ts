import type { EntityStatus, OnboardingFlow, OrganizationType, PermissionScope, ProfileStatus, ProfileType } from "@/types/app";

export type AcademicProgramLevel = "bachelor" | "master" | "phd" | "postgraduate" | "other";
export type AcademicTermType = "semester" | "trimester" | "module" | "term" | "other";
export type OrganizationUnitType = "faculty" | "department" | "school" | "center" | "campus" | "administrative_unit" | "other";
export type EditableAcademicUnitType = Extract<OrganizationUnitType, "faculty" | "department">;
export type EditableAcademicUnitStatus = Extract<EntityStatus, "active" | "inactive" | "archived">;

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamped = { created_at: string };

export type AcademicStructureManagementOverview = {
  profile_id: string;
  organization_id: string;
  university_name: string;
  active_context: {
    university_id: string;
    university_name: string;
    organization_unit_id: string | null;
    organization_unit_name: string | null;
    academic_program_id: string | null;
    academic_program_name: string | null;
    program_level: AcademicProgramLevel | null;
    academic_year_id: string | null;
    academic_year_name: string | null;
    academic_year_code: string | null;
    academic_term_id: string | null;
    academic_term_name: string | null;
    academic_group_id: string | null;
    academic_group_name: string | null;
    academic_group_code: string | null;
  };
  organization_units: Array<{ id: string; parent_unit_id: string | null; unit_type: OrganizationUnitType; code: string; name: string; status: EntityStatus }>;
  academic_programs: Array<{ id: string; organization_unit_id: string | null; code: string; name: string; program_level: AcademicProgramLevel; standard_duration_years: number | null; status: EntityStatus }>;
  academic_years: Array<{ id: string; code: string; name: string; start_date: string; end_date: string; is_current: boolean; status: EntityStatus }>;
  academic_terms: Array<{ id: string; academic_year_id: string; code: string; name: string; term_type: AcademicTermType; term_number: number | null; start_date: string; end_date: string; status: EntityStatus }>;
  academic_groups: Array<{ id: string; academic_program_id: string; academic_year_id: string | null; academic_term_id: string | null; code: string; name: string; status: EntityStatus }>;
};

export type OrganizationStructureManagementOverview = {
  profile_id: string;
  organization_id: string;
  organization_name: string;
  organization_type: OrganizationType;
  organization_status: EntityStatus;
  training_periods: Array<{ id: string; code: string; name: string; start_date: string; end_date: string; is_current: boolean; status: EntityStatus }>;
};

export type AcademicUnitsEditorOverview = {
  actor_profile_id: string;
  actor_mode: "university_admin" | "platform_admin";
  selected_university: { id: string; name: string; status: EntityStatus } | null;
  universities: Array<{ id: string; name: string; status: EntityStatus }>;
  units: Array<{
    id: string;
    organization_id: string;
    parent_unit_id: string | null;
    unit_type: EditableAcademicUnitType;
    code: string;
    name: string;
    description: string | null;
    status: EditableAcademicUnitStatus;
    created_at: string;
    updated_at: string;
  }>;
};

export type AcademicProgramsEditorOverview = {
  actor_profile_id: string;
  actor_mode: "university_admin" | "platform_admin";
  selected_university: { id: string; name: string; status: EntityStatus } | null;
  universities: Array<{ id: string; name: string; status: EntityStatus }>;
  units: Array<{
    id: string;
    parent_unit_id: string | null;
    unit_type: EditableAcademicUnitType;
    code: string;
    name: string;
    status: EditableAcademicUnitStatus;
  }>;
  programs: Array<{
    id: string;
    organization_id: string;
    organization_unit_id: string | null;
    code: string;
    name: string;
    description: string | null;
    program_level: AcademicProgramLevel;
    standard_duration_years: number | null;
    status: EditableAcademicUnitStatus;
    created_at: string;
    updated_at: string;
  }>;
};

export type PlatformAdminOrganizationsEditorOverview = {
  actor_profile_id: string;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    type: OrganizationType;
    description: string | null;
    logo_url: string | null;
    website: string | null;
    status: EntityStatus;
    created_at: string;
    updated_at: string;
  }>;
};

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: Timestamped & { id: string; name: string; slug: string; type: OrganizationType; description: string | null; logo_url: string | null; website: string | null; status: string; updated_at: string };
        Insert: { id?: string; name: string; slug: string; type: OrganizationType; description?: string | null; logo_url?: string | null; website?: string | null; status?: string; created_at?: string; updated_at?: string };
        Update: { name?: string; slug?: string; type?: OrganizationType; description?: string | null; logo_url?: string | null; website?: string | null; status?: string; updated_at?: string };
        Relationships: [];
      };
      organization_units: {
        Row: Timestamped & { id: string; organization_id: string; parent_unit_id: string | null; unit_type: OrganizationUnitType; code: string; name: string; description: string | null; status: EntityStatus; updated_at: string };
        Insert: { id?: string; organization_id: string; parent_unit_id?: string | null; unit_type: OrganizationUnitType; code: string; name: string; description?: string | null; status?: EntityStatus; created_at?: string; updated_at?: string };
        Update: { organization_id?: string; parent_unit_id?: string | null; unit_type?: OrganizationUnitType; code?: string; name?: string; description?: string | null; status?: EntityStatus; updated_at?: string };
        Relationships: [];
      };
      academic_programs: {
        Row: Timestamped & { id: string; organization_id: string; organization_unit_id: string | null; code: string; name: string; description: string | null; program_level: AcademicProgramLevel; standard_duration_years: number | null; status: EntityStatus; updated_at: string };
        Insert: { id?: string; organization_id: string; organization_unit_id?: string | null; code: string; name: string; description?: string | null; program_level: AcademicProgramLevel; standard_duration_years?: number | null; status?: EntityStatus; created_at?: string; updated_at?: string };
        Update: { organization_id?: string; organization_unit_id?: string | null; code?: string; name?: string; description?: string | null; program_level?: AcademicProgramLevel; standard_duration_years?: number | null; status?: EntityStatus; updated_at?: string };
        Relationships: [];
      };
      academic_years: {
        Row: Timestamped & { id: string; organization_id: string; code: string; name: string; start_date: string; end_date: string; is_current: boolean; status: EntityStatus; updated_at: string };
        Insert: { id?: string; organization_id: string; code: string; name: string; start_date: string; end_date: string; is_current?: boolean; status?: EntityStatus; created_at?: string; updated_at?: string };
        Update: { organization_id?: string; code?: string; name?: string; start_date?: string; end_date?: string; is_current?: boolean; status?: EntityStatus; updated_at?: string };
        Relationships: [];
      };
      academic_terms: {
        Row: Timestamped & { id: string; organization_id: string; academic_year_id: string; code: string; name: string; term_type: AcademicTermType; term_number: number | null; start_date: string; end_date: string; status: EntityStatus; updated_at: string };
        Insert: { id?: string; organization_id: string; academic_year_id: string; code: string; name: string; term_type: AcademicTermType; term_number?: number | null; start_date: string; end_date: string; status?: EntityStatus; created_at?: string; updated_at?: string };
        Update: { organization_id?: string; academic_year_id?: string; code?: string; name?: string; term_type?: AcademicTermType; term_number?: number | null; start_date?: string; end_date?: string; status?: EntityStatus; updated_at?: string };
        Relationships: [];
      };
      academic_groups: {
        Row: Timestamped & { id: string; organization_id: string; academic_program_id: string; academic_year_id: string | null; academic_term_id: string | null; code: string; name: string; description: string | null; status: EntityStatus; updated_at: string };
        Insert: { id?: string; organization_id: string; academic_program_id: string; academic_year_id?: string | null; academic_term_id?: string | null; code: string; name: string; description?: string | null; status?: EntityStatus; created_at?: string; updated_at?: string };
        Update: { organization_id?: string; academic_program_id?: string; academic_year_id?: string | null; academic_term_id?: string | null; code?: string; name?: string; description?: string | null; status?: EntityStatus; updated_at?: string };
        Relationships: [];
      };
      academic_profile_contexts: {
        Row: Timestamped & { id: string; profile_id: string; organization_id: string; organization_unit_id: string | null; academic_program_id: string | null; academic_year_id: string | null; academic_term_id: string | null; academic_group_id: string | null; status: EntityStatus; is_primary: boolean; started_at: string | null; ended_at: string | null; updated_at: string };
        Insert: { id?: string; profile_id: string; organization_id: string; organization_unit_id?: string | null; academic_program_id?: string | null; academic_year_id?: string | null; academic_term_id?: string | null; academic_group_id?: string | null; status?: EntityStatus; is_primary?: boolean; started_at?: string | null; ended_at?: string | null; created_at?: string; updated_at?: string };
        Update: { organization_id?: string; organization_unit_id?: string | null; academic_program_id?: string | null; academic_year_id?: string | null; academic_term_id?: string | null; academic_group_id?: string | null; status?: EntityStatus; is_primary?: boolean; started_at?: string | null; ended_at?: string | null; updated_at?: string };
        Relationships: [];
      };
      academic_structure_audit_events: {
        Row: Timestamped & { id: string; actor_user_id: string; actor_profile_id: string; actor_role: "university_admin" | "platform_admin"; action: "create" | "update" | "status_change"; resource_type: "organization_unit"; resource_id: string | null; organization_id: string; before_snapshot: Json | null; after_snapshot: Json | null };
        Insert: { id?: string; actor_user_id: string; actor_profile_id: string; actor_role: "university_admin" | "platform_admin"; action: "create" | "update" | "status_change"; resource_type?: "organization_unit"; resource_id?: string | null; organization_id: string; before_snapshot?: Json | null; after_snapshot?: Json | null; created_at?: string };
        Update: never;
        Relationships: [];
      };
      academic_program_audit_events: {
        Row: Timestamped & { id: string; actor_user_id: string; actor_profile_id: string; actor_role: "university_admin" | "platform_admin"; action: "create" | "update" | "status_change"; resource_type: "academic_program"; resource_id: string | null; organization_id: string; before_snapshot: Json | null; after_snapshot: Json | null };
        Insert: { id?: string; actor_user_id: string; actor_profile_id: string; actor_role: "university_admin" | "platform_admin"; action: "create" | "update" | "status_change"; resource_type?: "academic_program"; resource_id?: string | null; organization_id: string; before_snapshot?: Json | null; after_snapshot?: Json | null; created_at?: string };
        Update: never;
        Relationships: [];
      };
      platform_admin_organization_audit_events: {
        Row: Timestamped & { id: string; actor_user_id: string; actor_profile_id: string; actor_role: "platform_admin"; action: "create" | "update" | "status_change"; resource_type: "organization"; resource_id: string; before_snapshot: Json | null; after_snapshot: Json | null };
        Insert: { id?: string; actor_user_id: string; actor_profile_id: string; actor_role?: "platform_admin"; action: "create" | "update" | "status_change"; resource_type?: "organization"; resource_id: string; before_snapshot?: Json | null; after_snapshot?: Json | null; created_at?: string };
        Update: never;
        Relationships: [];
      };
      organization_training_periods: {
        Row: Timestamped & { id: string; organization_id: string; code: string; name: string; start_date: string; end_date: string; is_current: boolean; status: EntityStatus; updated_at: string };
        Insert: { id?: string; organization_id: string; code: string; name: string; start_date: string; end_date: string; is_current?: boolean; status?: EntityStatus; created_at?: string; updated_at?: string };
        Update: { organization_id?: string; code?: string; name?: string; start_date?: string; end_date?: string; is_current?: boolean; status?: EntityStatus; updated_at?: string };
        Relationships: [];
      };
      profiles: {
        Row: Timestamped & { id: string; user_id: string; profile_type: ProfileType; display_name: string; first_name: string | null; last_name: string | null; label: string | null; organization_id: string | null; university_id: string | null; academic_program_id: string | null; group_id: string | null; preferred_locale: "ro" | "en"; onboarding_flow: OnboardingFlow; terms_accepted_at: string | null; terms_version: string | null; is_default: boolean; status: ProfileStatus; updated_at: string };
        Insert: { id?: string; user_id: string; profile_type: ProfileType; display_name: string; first_name?: string | null; last_name?: string | null; label?: string | null; organization_id?: string | null; university_id?: string | null; academic_program_id?: string | null; group_id?: string | null; preferred_locale?: "ro" | "en"; onboarding_flow?: OnboardingFlow; terms_accepted_at?: string | null; terms_version?: string | null; is_default?: boolean; status?: ProfileStatus; created_at?: string; updated_at?: string };
        Update: { profile_type?: ProfileType; display_name?: string; first_name?: string | null; last_name?: string | null; label?: string | null; organization_id?: string | null; university_id?: string | null; academic_program_id?: string | null; group_id?: string | null; preferred_locale?: "ro" | "en"; onboarding_flow?: OnboardingFlow; terms_accepted_at?: string | null; terms_version?: string | null; is_default?: boolean; status?: ProfileStatus; updated_at?: string };
        Relationships: [];
      };
      onboarding_requests: {
        Row: Timestamped & { id: string; user_id: string; profile_id: string; flow: Exclude<OnboardingFlow, "individual">; invitation_code_hash: string | null; organization_name: string | null; organization_type: string | null; website: string | null; reason: string | null; status: "pending_email_confirmation" | "pending_organization_approval" | "pending_review" | "approved" | "rejected"; reviewed_by_profile_id: string | null; reviewed_at: string | null; updated_at: string };
        Insert: { id?: string; user_id: string; profile_id: string; flow: Exclude<OnboardingFlow, "individual">; invitation_code_hash?: string | null; organization_name?: string | null; organization_type?: string | null; website?: string | null; reason?: string | null; status: "pending_email_confirmation" | "pending_organization_approval" | "pending_review" | "approved" | "rejected"; reviewed_by_profile_id?: string | null; reviewed_at?: string | null; created_at?: string; updated_at?: string };
        Update: { status?: "pending_email_confirmation" | "pending_organization_approval" | "pending_review" | "approved" | "rejected"; reviewed_by_profile_id?: string | null; reviewed_at?: string | null; updated_at?: string };
        Relationships: [];
      };
      organization_members: {
        Row: Timestamped & { id: string; organization_id: string; profile_id: string; status: string; joined_at: string };
        Insert: { id?: string; organization_id: string; profile_id: string; status?: string; joined_at?: string; created_at?: string };
        Update: { status?: string; joined_at?: string };
        Relationships: [];
      };
      roles: {
        Row: Timestamped & { id: string; code: string; name: string; scope: PermissionScope; description: string | null };
        Insert: { id?: string; code: string; name: string; scope: PermissionScope; description?: string | null; created_at?: string };
        Update: { code?: string; name?: string; scope?: PermissionScope; description?: string | null };
        Relationships: [];
      };
      permissions: {
        Row: Timestamped & { id: string; code: string; resource: string; action: string; description: string | null };
        Insert: { id?: string; code: string; resource: string; action: string; description?: string | null; created_at?: string };
        Update: { code?: string; resource?: string; action?: string; description?: string | null };
        Relationships: [];
      };
      role_permissions: {
        Row: Timestamped & { id: string; role_id: string; permission_id: string; allowed: boolean; approval_required: boolean };
        Insert: { id?: string; role_id: string; permission_id: string; allowed?: boolean; approval_required?: boolean; created_at?: string };
        Update: { allowed?: boolean; approval_required?: boolean };
        Relationships: [];
      };
      profile_roles: {
        Row: Timestamped & { id: string; profile_id: string; role_id: string; scope_type: PermissionScope; scope_id: string | null };
        Insert: { id?: string; profile_id: string; role_id: string; scope_type: PermissionScope; scope_id?: string | null; created_at?: string };
        Update: { role_id?: string; scope_type?: PermissionScope; scope_id?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      complete_email_onboarding: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_platform_admin_overview: {
        Args: { requested_profile_id: string };
        Returns: {
          active_profiles: number;
          organizations: number;
          roles: number;
          permissions: number;
          pending_approvals: number;
        }[];
      };
      get_home_academic_context: {
        Args: { requested_profile_id: string };
        Returns: {
          profile_id: string;
          university_id: string | null;
          university_name: string | null;
          faculty_id: string | null;
          faculty_name: string | null;
          academic_program_id: string | null;
          academic_program_name: string | null;
          program_level: AcademicProgramLevel | null;
          academic_year_id: string | null;
          academic_year_name: string | null;
          academic_year_code: string | null;
          academic_term_id: string | null;
          academic_term_name: string | null;
          academic_term_number: number | null;
          academic_group_id: string | null;
          academic_group_name: string | null;
          academic_group_code: string | null;
          context_status: EntityStatus | null;
          is_primary: boolean | null;
        }[];
      };
      get_home_training_context: {
        Args: { requested_profile_id: string };
        Returns: {
          profile_id: string;
          organization_id: string | null;
          organization_name: string | null;
          organization_type: OrganizationType | null;
          training_period_id: string | null;
          training_period_name: string | null;
          training_period_code: string | null;
          training_period_start_date: string | null;
          training_period_end_date: string | null;
          is_current: boolean | null;
        }[];
      };
      get_academic_structure_management_overview: {
        Args: { requested_profile_id: string };
        Returns: AcademicStructureManagementOverview;
      };
      get_organization_structure_management_overview: {
        Args: { requested_profile_id: string };
        Returns: OrganizationStructureManagementOverview;
      };
      get_academic_units_editor_overview: {
        Args: { requested_profile_id: string; target_university_id?: string | null };
        Returns: AcademicUnitsEditorOverview;
      };
      create_academic_unit: {
        Args: {
          requested_profile_id: string;
          target_university_id: string;
          parent_unit_id: string | null;
          unit_type: EditableAcademicUnitType;
          code: string;
          name: string;
          description: string | null;
          status?: EditableAcademicUnitStatus;
        };
        Returns: AcademicUnitsEditorOverview["units"][number];
      };
      update_academic_unit: {
        Args: {
          requested_profile_id: string;
          unit_id: string;
          parent_unit_id: string | null;
          code: string;
          name: string;
          description: string | null;
          status: EditableAcademicUnitStatus;
        };
        Returns: AcademicUnitsEditorOverview["units"][number];
      };
      has_platform_admin_console_access: {
        Args: { requested_profile_id: string };
        Returns: boolean;
      };
      list_platform_admin_onboarding_requests: {
        Args: { requested_profile_id: string };
        Returns: {
          id: string;
          flow: Exclude<OnboardingFlow, "individual">;
          organization_name: string | null;
          organization_type: string | null;
          status: "pending_email_confirmation" | "pending_organization_approval" | "pending_review" | "approved" | "rejected";
          created_at: string;
        }[];
      };
      list_platform_admin_organizations: {
        Args: { requested_profile_id: string };
        Returns: {
          id: string;
          name: string;
          slug: string;
          organization_type: OrganizationType;
          status: "active" | "inactive" | "suspended" | "archived";
          website: string | null;
          created_at: string;
        }[];
      };
      get_academic_programs_editor_overview: {
        Args: { requested_profile_id: string; target_university_id?: string | null };
        Returns: AcademicProgramsEditorOverview;
      };
      create_academic_program: {
        Args: {
          requested_profile_id: string;
          target_university_id: string;
          target_organization_unit_id: string;
          code: string;
          name: string;
          description: string | null;
          program_level: AcademicProgramLevel;
          status?: EditableAcademicUnitStatus;
        };
        Returns: AcademicProgramsEditorOverview["programs"][number];
      };
      update_academic_program: {
        Args: {
          requested_profile_id: string;
          program_id: string;
          target_organization_unit_id: string;
          code: string;
          name: string;
          description: string | null;
          program_level: AcademicProgramLevel;
          status: EditableAcademicUnitStatus;
        };
        Returns: AcademicProgramsEditorOverview["programs"][number];
      };
      get_platform_admin_organizations_editor: {
        Args: { requested_profile_id: string };
        Returns: PlatformAdminOrganizationsEditorOverview;
      };
      create_platform_admin_organization: {
        Args: {
          requested_profile_id: string;
          name: string;
          slug: string | null;
          org_type: OrganizationType;
          description: string | null;
          logo_url: string | null;
          website: string | null;
          status?: EntityStatus;
        };
        Returns: PlatformAdminOrganizationsEditorOverview["organizations"][number];
      };
      update_platform_admin_organization: {
        Args: {
          requested_profile_id: string;
          organization_id: string;
          name: string;
          slug: string | null;
          org_type: OrganizationType;
          description: string | null;
          logo_url: string | null;
          website: string | null;
          status: EntityStatus;
        };
        Returns: PlatformAdminOrganizationsEditorOverview["organizations"][number];
      };
      list_platform_admin_profiles: {
        Args: { requested_profile_id: string };
        Returns: {
          id: string;
          display_name: string;
          profile_type: ProfileType;
          status: ProfileStatus;
          organization_name: string | null;
          university_id: string | null;
          created_at: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type TableRow<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type { Json };
