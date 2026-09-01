import { redirect } from "next/navigation";

import { AcademicStructureView } from "@/components/manage/academic-structure-view";
import { StructureOverviewShell, StructureRestricted, StructureUnavailable } from "@/components/manage/structure-overview-shell";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { getDashboardContext } from "@/lib/dashboard/get-dashboard-context";
import { getAcademicStructureManagement } from "@/lib/manage/get-academic-structure-management";
import { canAccessAcademicStructureManagement } from "@/lib/manage/structure-management-access";

export default async function AcademicStructureManagementPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const [dictionary, context] = await Promise.all([getDictionary(locale), getDashboardContext()]);
  const t = dictionary.app.structureManagement;
  if (!context.activeProfile || !context.variant) return null;
  if (context.variant === "platformAdmin" && context.canAccessPlatformAdmin) redirect(`/${locale}/admin`);

  const allowed = canAccessAcademicStructureManagement(context.roleCodes, context.academicContext?.university_id);
  if (!allowed) return <StructureRestricted locale={locale} translations={t.common} />;

  const overview = await getAcademicStructureManagement(context.activeProfile.id);
  if (!overview) return <StructureOverviewShell eyebrow={t.common.eyebrow} title={t.academic.title} description={t.academic.description} readOnly={t.common.readOnly}><StructureUnavailable translations={t.common} /></StructureOverviewShell>;
  return <AcademicStructureView locale={locale} overview={overview} translations={t} />;
}
