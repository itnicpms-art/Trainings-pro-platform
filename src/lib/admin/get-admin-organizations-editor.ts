import "server-only";

import { cache } from "react";

import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { hasPermission } from "@/lib/permissions/has-permission";
import { hasRole } from "@/lib/permissions/has-role";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PlatformAdminOrganizationsEditorOverview } from "@/types/database";

export const getAdminOrganizationsEditor = cache(
  async (): Promise<PlatformAdminOrganizationsEditorOverview | null> => {
    const activeProfile = await getActiveProfile();
    if (!activeProfile) return null;

    const [isPlatformAdmin, canAccessAdmin, supabase] = await Promise.all([
      hasRole(activeProfile.id, "platform_admin", { scopeType: "platform", scopeId: null }),
      hasPermission(activeProfile.id, "admin.access", { scopeType: "platform", scopeId: null }),
      createServerSupabaseClient(),
    ]);

    if (!isPlatformAdmin || !canAccessAdmin || !supabase) return null;

    const { data, error } = await supabase.rpc("get_platform_admin_organizations_editor", {
      requested_profile_id: activeProfile.id,
    });

    return error ? null : data;
  },
);
