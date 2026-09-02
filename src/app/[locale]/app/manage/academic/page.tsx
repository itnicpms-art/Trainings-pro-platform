import { redirect } from "next/navigation";

import { AcademicStructureView } from "@/components/manage/academic-structure-view";
import { AcademicUnitsEditor } from "@/components/manage/academic-units-editor";
import { StructureOverviewShell, StructureRestricted, StructureUnavailable } from "@/components/manage/structure-overview-shell";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { getDashboardContext } from "@/lib/dashboard/get-dashboard-context";
import { getAcademicStructureManagement } from "@/lib/manage/get-academic-structure-management";
import { getAcademicUnitsEditor } from "@/lib/manage/get-academic-units-editor";
import { canAccessAcademicStructureManagement } from "@/lib/manage/structure-management-access";
import { mutateUniversityAcademicUnitAction } from "./actions";

export default async function AcademicStructureManagementPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const [dictionary, context] = await Promise.all([getDictionary(locale), getDashboardContext()]);
  const t = dictionary.app.structureManagement;
  if (!context.activeProfile || !context.variant) return null;
  if (context.variant === "platformAdmin" && context.canAccessPlatformAdmin) redirect(`/${locale}/admin`);

  const scopedUniversityId = context.academicContext?.university_id
    ?? context.roles.find((role) => role.code === "university_admin" && role.scopeType === "university")?.scopeId;
  const allowed = canAccessAcademicStructureManagement(context.roleCodes, scopedUniversityId);
  if (!allowed) return <StructureRestricted locale={locale} translations={t.common} />;

  const isUniversityAdmin = context.roleCodes.has("university_admin");
  const [overview, editorOverview] = await Promise.all([
    getAcademicStructureManagement(context.activeProfile.id),
    isUniversityAdmin ? getAcademicUnitsEditor(context.activeProfile.id) : Promise.resolve(null),
  ]);
  if (!overview && editorOverview?.selected_university) return <StructureOverviewShell eyebrow={t.common.eyebrow} title={t.academic.title} description={t.academic.description} readOnly={t.academic.editor.badge}><AcademicUnitsEditor locale={locale} overview={editorOverview} translations={t.academic.editor} action={mutateUniversityAcademicUnitAction} /></StructureOverviewShell>;
  if (!overview) return <StructureOverviewShell eyebrow={t.common.eyebrow} title={t.academic.title} description={t.academic.description} readOnly={t.common.readOnly}><StructureUnavailable translations={t.common} /></StructureOverviewShell>;
  return <AcademicStructureView locale={locale} overview={overview} translations={t} editorOverview={editorOverview} editorAction={isUniversityAdmin ? mutateUniversityAcademicUnitAction : undefined} />;
}
