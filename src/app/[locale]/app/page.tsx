import { redirect } from "next/navigation";

import { AdaptiveDashboard } from "@/components/dashboard/adaptive-dashboard";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { getDashboardContext } from "@/lib/dashboard/get-dashboard-context";
import { hasPermission } from "@/lib/permissions/has-permission";
import { hasRole } from "@/lib/permissions/has-role";

export default async function MemberDashboardPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  const context = await getDashboardContext();

  if (!context.activeProfile || !context.variant) return null;

  const [isPlatformAdmin, canAccessAdmin] = await Promise.all([
    hasRole(context.activeProfile.id, "platform_admin", { scopeType: "platform", scopeId: null }),
    hasPermission(context.activeProfile.id, "admin.access", { scopeType: "platform", scopeId: null }),
  ]);
  if (isPlatformAdmin && canAccessAdmin) redirect(`/${locale}/admin`);

  const profileLabel = dictionary.app.profiles.profileTypes[context.activeProfile.profile_type];
  const statusLabel = dictionary.app.profiles.statuses[context.activeProfile.status];

  return <AdaptiveDashboard locale={locale} translations={dictionary.app.dashboardShell} variant={context.variant} profile={context.activeProfile} profileLabel={profileLabel} statusLabel={statusLabel} activeProfileCount={context.activeProfileCount} organizationCount={context.organizationCount} showOrganizationContext={context.showOrganizationContext} showAcademicContext={context.showAcademicContext} showTrainingContext={context.showTrainingContext} academicContext={context.academicContext} trainingContext={context.trainingContext} canAccessPlatformAdmin={context.canAccessPlatformAdmin} />;
}
