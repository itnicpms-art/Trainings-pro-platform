import type { OrganizationType, PermissionScope, ProfileType } from "@/types/app";

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
        Row: Timestamped & { id: string; user_id: string; profile_type: ProfileType; display_name: string; label: string | null; organization_id: string | null; university_id: string | null; academic_program_id: string | null; group_id: string | null; is_default: boolean; status: string; updated_at: string };
        Insert: { id?: string; user_id: string; profile_type: ProfileType; display_name: string; label?: string | null; organization_id?: string | null; university_id?: string | null; academic_program_id?: string | null; group_id?: string | null; is_default?: boolean; status?: string; created_at?: string; updated_at?: string };
        Update: { profile_type?: ProfileType; display_name?: string; label?: string | null; organization_id?: string | null; university_id?: string | null; academic_program_id?: string | null; group_id?: string | null; is_default?: boolean; status?: string; updated_at?: string };
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
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type TableRow<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type { Json };
