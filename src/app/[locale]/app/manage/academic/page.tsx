import { redirect } from "next/navigation";

import { AcademicGroupsEditor } from "@/components/manage/academic-groups-editor";
import { AcademicProgramsEditor } from "@/components/manage/academic-programs-editor";
import { AcademicStructureView } from "@/components/manage/academic-structure-view";
import { AcademicTermsEditor } from "@/components/manage/academic-terms-editor";
import { AcademicUnitsEditor } from "@/components/manage/academic-units-editor";
import { AcademicYearsEditor } from "@/components/manage/academic-years-editor";
import { StructureOverviewShell, StructureRestricted, StructureUnavailable } from "@/components/manage/structure-overview-shell";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { getDashboardContext } from "@/lib/dashboard/get-dashboard-context";
import { getAcademicCalendarEditor } from "@/lib/manage/get-academic-calendar-editor";
import { getAcademicGroupsEditor } from "@/lib/manage/get-academic-groups-editor";
import { getAcademicProgramsEditor } from "@/lib/manage/get-academic-programs-editor";
import { getAcademicStructureManagement } from "@/lib/manage/get-academic-structure-management";
import { getAcademicUnitsEditor } from "@/lib/manage/get-academic-units-editor";
import { canAccessAcademicStructureManagement } from "@/lib/manage/structure-management-access";
import {
  mutateUniversityAcademicGroupAction,
  mutateUniversityAcademicProgramAction,
  mutateUniversityAcademicTermAction,
  mutateUniversityAcademicUnitAction,
  mutateUniversityAcademicYearAction,
} from "./actions";

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
  const [overview, editorOverview, programsEditorOverview, calendarEditorOverview, groupsEditorOverview] = await Promise.all([
    getAcademicStructureManagement(context.activeProfile.id),
    isUniversityAdmin ? getAcademicUnitsEditor(context.activeProfile.id) : Promise.resolve(null),
    isUniversityAdmin ? getAcademicProgramsEditor(context.activeProfile.id) : Promise.resolve(null),
    isUniversityAdmin ? getAcademicCalendarEditor(context.activeProfile.id) : Promise.resolve(null),
    isUniversityAdmin ? getAcademicGroupsEditor(context.activeProfile.id) : Promise.resolve(null),
  ]);
  if (!overview && editorOverview?.selected_university) {
    return (
      <StructureOverviewShell eyebrow={t.common.eyebrow} title={t.academic.title} description={t.academic.description} readOnly={t.academic.editor.badge}>
        <div className="space-y-4">
          <AcademicUnitsEditor locale={locale} overview={editorOverview} translations={t.academic.editor} action={mutateUniversityAcademicUnitAction} />
          {programsEditorOverview?.selected_university ? (
            <AcademicProgramsEditor
              locale={locale}
              overview={programsEditorOverview}
              levelLabels={t.common.programLevels}
              translations={t.academic.programsEditor}
              action={mutateUniversityAcademicProgramAction}
            />
          ) : null}
          {calendarEditorOverview?.selected_university ? (
            <>
              <AcademicYearsEditor locale={locale} overview={calendarEditorOverview} translations={t.academic.yearsEditor} action={mutateUniversityAcademicYearAction} />
              <AcademicTermsEditor
                locale={locale}
                overview={calendarEditorOverview}
                typeLabels={t.common.termTypes}
                translations={t.academic.termsEditor}
                action={mutateUniversityAcademicTermAction}
              />
            </>
          ) : null}
          {groupsEditorOverview?.selected_university ? (
            <AcademicGroupsEditor
              locale={locale}
              overview={groupsEditorOverview}
              translations={t.academic.groupsEditor}
              action={mutateUniversityAcademicGroupAction}
            />
          ) : null}
        </div>
      </StructureOverviewShell>
    );
  }
  if (!overview) return <StructureOverviewShell eyebrow={t.common.eyebrow} title={t.academic.title} description={t.academic.description} readOnly={t.common.readOnly}><StructureUnavailable translations={t.common} /></StructureOverviewShell>;
  return (
    <AcademicStructureView
      locale={locale}
      overview={overview}
      translations={t}
      editorOverview={editorOverview}
      editorAction={isUniversityAdmin ? mutateUniversityAcademicUnitAction : undefined}
      programsEditorOverview={programsEditorOverview}
      programsEditorAction={isUniversityAdmin ? mutateUniversityAcademicProgramAction : undefined}
      calendarEditorOverview={calendarEditorOverview}
      yearAction={isUniversityAdmin ? mutateUniversityAcademicYearAction : undefined}
      termAction={isUniversityAdmin ? mutateUniversityAcademicTermAction : undefined}
      groupsEditorOverview={groupsEditorOverview}
      groupAction={isUniversityAdmin ? mutateUniversityAcademicGroupAction : undefined}
    />
  );
}
