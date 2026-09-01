import { redirect } from "next/navigation";

import { OrganizationStructureView } from "@/components/manage/organization-structure-view";
import { StructureOverviewShell, StructureRestricted, StructureUnavailable } from "@/components/manage/structure-overview-shell";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { getDashboardContext } from "@/lib/dashboard/get-dashboard-context";
import { getOrganizationStructureManagement } from "@/lib/manage/get-organization-structure-management";
import { canAccessOrganizationStructureManagement } from "@/lib/manage/structure-management-access";

export default async function OrganizationStructureManagementPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const [dictionary, context] = await Promise.all([getDictionary(locale), getDashboardContext()]);
  const t = dictionary.app.structureManagement;
  if (!context.activeProfile || !context.variant) return null;
  if (context.variant === "platformAdmin" && context.canAccessPlatformAdmin) redirect(`/${locale}/admin`);

  const allowed = canAccessOrganizationStructureManagement(context.roleCodes, context.activeProfile.organization_id);
  if (!allowed) return <StructureRestricted locale={locale} translations={t.common} />;

  const overview = await getOrganizationStructureManagement(context.activeProfile.id);
  if (!overview) return <StructureOverviewShell eyebrow={t.common.eyebrow} title={t.organization.title} description={t.organization.description} readOnly={t.common.readOnly}><StructureUnavailable translations={t.common} /></StructureOverviewShell>;
  return <OrganizationStructureView locale={locale} overview={overview} translations={t} />;
}
