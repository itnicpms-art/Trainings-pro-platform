import { AdaptiveDashboard } from "@/components/dashboard/adaptive-dashboard";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { getDashboardContext } from "@/lib/dashboard/get-dashboard-context";

export default async function MemberDashboardPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  const context = await getDashboardContext();

  if (!context.activeProfile || !context.variant) return null;

  const profileLabel = dictionary.app.profiles.profileTypes[context.activeProfile.profile_type];
  const statusLabel = dictionary.app.profiles.statuses[context.activeProfile.status];

  return <AdaptiveDashboard locale={locale} translations={dictionary.app.dashboardShell} variant={context.variant} profile={context.activeProfile} profileLabel={profileLabel} statusLabel={statusLabel} activeProfileCount={context.activeProfileCount} organizationCount={context.organizationCount} showOrganizationContext={context.showOrganizationContext} hasAcademicContext={context.hasAcademicContext} canAccessPlatformAdmin={context.canAccessPlatformAdmin} />;
}
