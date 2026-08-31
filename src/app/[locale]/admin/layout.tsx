import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AccountStatusState } from "@/components/auth/account-status-state";
import { AdminRestrictedState } from "@/components/auth/admin-restricted-state";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getUserProfiles } from "@/lib/auth/get-user-profiles";
import { hasPermission } from "@/lib/permissions/has-permission";
import { hasRole } from "@/lib/permissions/has-role";

export default async function AdminLayout({ children, params }: { children: ReactNode; params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const [activeProfile, profiles] = await Promise.all([getActiveProfile(), getUserProfiles()]);
  if (!activeProfile) {
    return <AccountStatusState locale={locale} languageLabel={dictionary.language.label} translations={dictionary.auth.accountStatus} status={profiles[0]?.status ?? null} />;
  }

  const [isPlatformAdmin, canAccessAdmin] = await Promise.all([
    hasRole(activeProfile.id, "platform_admin", { scopeType: "platform", scopeId: null }),
    hasPermission(activeProfile.id, "admin.access", { scopeType: "platform", scopeId: null }),
  ]);
  if (!isPlatformAdmin || !canAccessAdmin) {
    return <AdminRestrictedState locale={locale} languageLabel={dictionary.language.label} logoutLabel={dictionary.shell.logout} translations={dictionary.admin.restricted} />;
  }

  const profileOptions = profiles.filter((profile) => profile.status === "active").map((profile) => ({
    id: profile.id,
    displayName: profile.display_name,
    label: dictionary.app.profiles.profileTypes[profile.profile_type] ?? profile.label ?? dictionary.shell.memberRole,
  }));
  const profileSwitcherTranslations = {
    selected: dictionary.app.profiles.selected,
    selecting: dictionary.app.profiles.selecting,
    selectionSuccess: dictionary.app.profiles.selectionSuccess,
    selectionFailed: dictionary.app.profiles.selectionFailed,
  };

  return <div className="min-h-screen bg-slate-50"><aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block"><AdminSidebar locale={locale} translations={dictionary.shell} navigation={dictionary.admin.navigation} /></aside><div className="lg:pl-64"><Topbar area="admin" title={dictionary.shell.platformControl} locale={locale} translations={dictionary.shell} adminNavigation={dictionary.admin.navigation} languageLabel={dictionary.language.label} accountName={activeProfile.display_name || user.email || "Trainings PRO"} profileLabel={dictionary.shell.platformAdmin} activeProfileId={activeProfile.id} activeProfileName={activeProfile.display_name} activeProfileStatus={dictionary.shell.active} profiles={profileOptions} profileSwitcherTranslations={profileSwitcherTranslations} /><main className="p-4 sm:p-6 lg:p-7">{children}</main></div></div>;
}
