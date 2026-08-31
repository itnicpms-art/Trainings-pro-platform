import type { OnboardingFlow, OrganizationType, PermissionScope, ProfileStatus, ProfileType } from "@/types/app";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamped = { created_at: string };

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: Timestamped & { id: string; name: string; slug: string; type: OrganizationType; description: string | null; logo_url: string | null; website: string | null; status: string; updated_at: string };
        Insert: { id?: string; name: string; slug: string; type: OrganizationType; description?: string | null; logo_url?: string | null; website?: string | null; status?: string; created_at?: string; updated_at?: string };
        Update: { name?: string; slug?: string; type?: OrganizationType; description?: string | null; logo_url?: string | null; website?: string | null; status?: string; updated_at?: string };
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
