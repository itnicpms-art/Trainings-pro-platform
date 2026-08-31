import "server-only";

import { cache } from "react";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { hasPermission } from "@/lib/permissions/has-permission";
import { hasRole } from "@/lib/permissions/has-role";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type FunctionRows<Name extends keyof Database["public"]["Functions"]> = Database["public"]["Functions"][Name]["Returns"];

const getAdminContext = cache(async () => {
  const activeProfile = await getActiveProfile();
  if (!activeProfile) return null;

  const [isPlatformAdmin, canAccessAdmin, supabase] = await Promise.all([
    hasRole(activeProfile.id, "platform_admin", { scopeType: "platform", scopeId: null }),
    hasPermission(activeProfile.id, "admin.access", { scopeType: "platform", scopeId: null }),
    createServerSupabaseClient(),
  ]);

  if (!isPlatformAdmin || !canAccessAdmin || !supabase) return null;
  return { activeProfile, supabase };
});

export const getPlatformAdminOverview = cache(async () => {
  const context = await getAdminContext();
  if (!context) return null;
  const { data, error } = await context.supabase.rpc("get_platform_admin_overview", {
    requested_profile_id: context.activeProfile.id,
  });
  return error ? null : (data?.[0] ?? null);
});

export const getPlatformAdminOrganizations = cache(async (): Promise<FunctionRows<"list_platform_admin_organizations"> | null> => {
  const context = await getAdminContext();
  if (!context) return null;
  const { data, error } = await context.supabase.rpc("list_platform_admin_organizations", {
    requested_profile_id: context.activeProfile.id,
  });
  return error ? null : data;
});

export const getPlatformAdminProfiles = cache(async (): Promise<FunctionRows<"list_platform_admin_profiles"> | null> => {
  const context = await getAdminContext();
  if (!context) return null;
  const { data, error } = await context.supabase.rpc("list_platform_admin_profiles", {
    requested_profile_id: context.activeProfile.id,
  });
  return error ? null : data;
});

export const getPlatformAdminOnboardingRequests = cache(async (): Promise<FunctionRows<"list_platform_admin_onboarding_requests"> | null> => {
  const context = await getAdminContext();
  if (!context) return null;
  const { data, error } = await context.supabase.rpc("list_platform_admin_onboarding_requests", {
    requested_profile_id: context.activeProfile.id,
  });
  return error ? null : data;
});

export const getPlatformAdminRoleGovernance = cache(async () => {
  const context = await getAdminContext();
  if (!context) return null;

  const [rolesResult, permissionsResult, grantsResult] = await Promise.all([
    context.supabase.from("roles").select("id, code, name, scope, description").order("code"),
    context.supabase.from("permissions").select("id, code, resource, action, description").order("code"),
    context.supabase.from("role_permissions").select("role_id, permission_id, allowed, approval_required"),
  ]);

  if (rolesResult.error || permissionsResult.error || grantsResult.error) return null;
  return { roles: rolesResult.data, permissions: permissionsResult.data, grants: grantsResult.data };
});
