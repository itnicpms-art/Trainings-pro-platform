import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AccountStatusState } from "@/components/auth/account-status-state";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getDashboardContext } from "@/lib/dashboard/get-dashboard-context";

export default async function AppLayout({ children, params }: { children: ReactNode; params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const dashboardContext = await getDashboardContext();
  const { activeProfile, profiles } = dashboardContext;
  if (!activeProfile) {
    return <AccountStatusState locale={locale} languageLabel={dictionary.language.label} translations={dictionary.auth.accountStatus} status={profiles[0]?.status ?? null} />;
  }

  const profileLabel = dictionary.app.profiles.profileTypes[activeProfile.profile_type] ?? activeProfile.label ?? dictionary.shell.memberRole;
  const activeStatus = dictionary.app.profiles.statuses[activeProfile.status] ?? dictionary.shell.active;

  const dashboardVariant = dashboardContext.variant ?? "individualLearner";

  return <div className="min-h-screen bg-slate-50"><aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block"><AppSidebar locale={locale} translations={dictionary.shell} dashboardTranslations={dictionary.app.dashboardShell} dashboardVariant={dashboardVariant} activeProfileName={activeProfile.display_name} activeProfileStatus={activeStatus} /></aside><div className="lg:pl-64"><Topbar area="app" title="Trainings PRO" locale={locale} translations={dictionary.shell} dashboardTranslations={dictionary.app.dashboardShell} dashboardVariant={dashboardVariant} languageLabel={dictionary.language.label} accountName={activeProfile.display_name || user.email || "Trainings PRO"} profileLabel={profileLabel} activeProfileName={activeProfile.display_name} activeProfileStatus={activeStatus} /><main className="p-3 sm:p-4 lg:p-5">{children}</main></div></div>;
}
