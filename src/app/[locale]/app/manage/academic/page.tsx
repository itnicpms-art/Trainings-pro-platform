import { redirect } from "next/navigation";
import { z } from "zod";

import { AcademicGroupsEditor } from "@/components/manage/academic-groups-editor";
import { AcademicProgramStaffEditor } from "@/components/manage/academic-program-staff-editor";
import { AcademicProgramsEditor } from "@/components/manage/academic-programs-editor";
import { AcademicStructureView } from "@/components/manage/academic-structure-view";
import { AcademicTermsEditor } from "@/components/manage/academic-terms-editor";
import { AcademicUnitsEditor } from "@/components/manage/academic-units-editor";
import { AcademicYearsEditor } from "@/components/manage/academic-years-editor";
import { StructureOverviewShell, StructureRestricted, StructureUnavailable } from "@/components/manage/structure-overview-shell";
import { buttonVariants } from "@/components/ui/button";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { getDashboardContext } from "@/lib/dashboard/get-dashboard-context";
import { adaptProgramStaffOverview } from "@/lib/manage/adapt-program-staff-overview";
import { getAcademicCalendarEditor } from "@/lib/manage/get-academic-calendar-editor";
import { getAcademicGroupsEditor } from "@/lib/manage/get-academic-groups-editor";
import { getAcademicProgramStaffAssignmentsEditor } from "@/lib/manage/get-academic-program-staff-assignments-editor";
import { getAcademicProgramsEditor } from "@/lib/manage/get-academic-programs-editor";
import { getAcademicStructureManagement } from "@/lib/manage/get-academic-structure-management";
import { getAcademicUnitsEditor } from "@/lib/manage/get-academic-units-editor";
import { getAssignedAcademicPrograms } from "@/lib/manage/get-assigned-academic-programs";
import { getProgramStaffAcademicOverview } from "@/lib/manage/get-program-staff-academic-overview";
import { getStudentGroupMembershipEditor } from "@/lib/manage/get-student-group-membership-editor";
import { canAccessAcademicStructureManagement } from "@/lib/manage/structure-management-access";
import { cn } from "@/lib/utils";
import {
  mutateAcademicProgramStaffAssignmentAction,
  mutateUniversityAcademicGroupAction,
  mutateUniversityAcademicProgramAction,
  mutateUniversityAcademicTermAction,
  mutateUniversityAcademicUnitAction,
  mutateUniversityAcademicYearAction,
  mutateUniversityStudentGroupMembershipAction,
} from "./actions";

type SearchParams = Promise<{ program?: string | string[] }>;

export default async function AcademicStructureManagementPage({ params, searchParams }: { params: LocaleParams; searchParams: SearchParams }) {
  const locale = await resolveLocale(params);
  const [dictionary, context, query] = await Promise.all([getDictionary(locale), getDashboardContext(), searchParams]);
  const t = dictionary.app.structureManagement;
  if (!context.activeProfile || !context.variant) return null;
  if (context.variant === "platformAdmin" && context.canAccessPlatformAdmin) redirect(`/${locale}/admin`);

  // TASK 004.6.1: profiles.university_id is checked last, after the
  // existing academicContext/university_admin-role fallbacks, so this only
  // ever activates for a professor/program_coordinator whose own context
  // resolution doesn't already resolve a university -- e.g. one with zero
  // remaining program assignments, per canAccessAcademicStructureManagement's
  // own profile_type fallback below.
  const scopedUniversityId = context.academicContext?.university_id
    ?? context.roles.find((role) => role.code === "university_admin" && role.scopeType === "university")?.scopeId
    ?? context.activeProfile.university_id;
  const allowed = canAccessAcademicStructureManagement(context.roleCodes, scopedUniversityId, context.activeProfile.profile_type);
  if (!allowed) return <StructureRestricted locale={locale} translations={t.common} />;

  const isUniversityAdmin = context.roleCodes.has("university_admin");
  // PROGRAM ASSIGNMENT CONTROLS AUTHORIZATION for this branch, not
  // university/faculty membership -- see resolve_academic_program_editor_mode
  // (migration 016) and docs/tasks/TASK-004-6-1-academic-staff-program-access.md.
  // The profile_type fallback (mirroring canAccessAcademicStructureManagement's
  // own) is what routes a professor/program_coordinator with ZERO remaining
  // program assignments into this section at all, so they see the actual
  // "no assigned programs" empty state below instead of silently falling
  // through to neither branch -- it grants no data by itself:
  // getAssignedAcademicPrograms still independently returns an empty array
  // for such a profile regardless of profile_type.
  const isStaffProfileType = context.activeProfile.profile_type === "professor" || context.activeProfile.profile_type === "coordinator";
  const isProgramStaff = context.roleCodes.has("professor") || context.roleCodes.has("program_coordinator")
    || (Boolean(scopedUniversityId) && isStaffProfileType);

  const [
    overview, editorOverview, programsEditorOverview, calendarEditorOverview, groupsEditorOverview, membershipEditorOverview,
    assignedPrograms, staffAssignmentsOverview,
  ] = await Promise.all([
    getAcademicStructureManagement(context.activeProfile.id),
    isUniversityAdmin ? getAcademicUnitsEditor(context.activeProfile.id) : Promise.resolve(null),
    isUniversityAdmin ? getAcademicProgramsEditor(context.activeProfile.id) : Promise.resolve(null),
    isUniversityAdmin ? getAcademicCalendarEditor(context.activeProfile.id) : Promise.resolve(null),
    isUniversityAdmin ? getAcademicGroupsEditor(context.activeProfile.id) : Promise.resolve(null),
    isUniversityAdmin ? getStudentGroupMembershipEditor(context.activeProfile.id) : Promise.resolve(null),
    isProgramStaff ? getAssignedAcademicPrograms(context.activeProfile.id) : Promise.resolve([]),
    isUniversityAdmin ? getAcademicProgramStaffAssignmentsEditor(context.activeProfile.id) : Promise.resolve(null),
  ]);

  const requestedProgramId = Array.isArray(query.program) ? query.program[0] : query.program;
  const validRequestedProgramId = z.uuid().safeParse(requestedProgramId).success ? requestedProgramId : null;
  const selectedProgramId = (validRequestedProgramId && assignedPrograms?.some((program) => program.academic_program_id === validRequestedProgramId))
    ? validRequestedProgramId
    : (assignedPrograms?.[0]?.academic_program_id ?? null);
  const programStaffOverview = isProgramStaff && selectedProgramId
    ? await getProgramStaffAcademicOverview(context.activeProfile.id, selectedProgramId)
    : null;
  const adaptedProgramStaffOverview = programStaffOverview ? adaptProgramStaffOverview(programStaffOverview) : null;

  // assignedPrograms is null only on a genuine RPC/backend failure (see
  // getAssignedAcademicPrograms) -- it must never be presented as the
  // legitimate "zero assigned programs" empty state below. Within the
  // assignedPrograms.length > 0 branch, selectedProgramId is always
  // non-null (it falls back to assignedPrograms[0]), so a falsy
  // adaptedProgramStaffOverview there also always reflects a genuine
  // getProgramStaffAcademicOverview failure for a known-valid assignment,
  // never a legitimate empty state -- so it gets the same unavailable
  // message rather than silently rendering nothing.
  const programStaffSection = isProgramStaff ? (
    <div className="space-y-4">
      {assignedPrograms === null ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">{t.academic.programStaffOverview.unavailable}</div>
      ) : assignedPrograms.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">{t.academic.programStaffOverview.noPrograms}</div>
      ) : (
        <>
          {assignedPrograms.length > 1 ? (
            <form method="get" className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end">
              <label className="flex-1 space-y-2 text-sm font-medium text-[#06113B]">
                <span>{t.academic.programStaffOverview.programPickerLabel}</span>
                <select name="program" defaultValue={selectedProgramId ?? ""} className="h-9 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                  {assignedPrograms.map((program) => (
                    <option key={program.academic_program_id} value={program.academic_program_id}>
                      {program.name} — {program.role_codes.map((code) => t.academic.programStaffOverview.roleLabels[code]).join(" / ")}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={cn(buttonVariants(), "brand-gradient")}>{t.academic.programStaffOverview.selectProgram}</button>
            </form>
          ) : null}
          {adaptedProgramStaffOverview ? (
            <AcademicGroupsEditor
              locale={locale}
              overview={adaptedProgramStaffOverview.groupsOverview}
              translations={t.academic.groupsEditor}
              action={mutateUniversityAcademicGroupAction}
              membershipOverview={adaptedProgramStaffOverview.membershipOverview}
              membershipTranslations={t.academic.membershipEditor}
              membershipAction={mutateUniversityStudentGroupMembershipAction}
            />
          ) : (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">{t.academic.programStaffOverview.unavailable}</div>
          )}
        </>
      )}
    </div>
  ) : null;
  const staffAssignmentsSection = isUniversityAdmin && staffAssignmentsOverview?.selected_university ? (
    <AcademicProgramStaffEditor
      locale={locale}
      overview={staffAssignmentsOverview}
      translations={t.academic.programStaffAssignments}
      action={mutateAcademicProgramStaffAssignmentAction}
    />
  ) : null;

  // get_academic_structure_management_overview (migration 006) picks a
  // single role via LIMIT 1 and, for professor/program_coordinator,
  // requires an active academic_profile_contexts row whose
  // academic_program_id matches the selected profile_roles.scope_id --
  // a single-context model that predates and is independent of TASK
  // 004.6.1's multi-program profile_roles assignments. A program staff
  // profile granted purely through grant_academic_program_staff_role has
  // no such context row, so `overview` is null for them regardless of
  // how many real program assignments they hold. Program staff rendering
  // must therefore never depend on `overview` -- it is returned here on
  // its own, before any of the legacy overview-gated branches below,
  // so a zero-assignment coordinator gets the intended noPrograms empty
  // state (not the generic structure-unavailable state) and a
  // multi-program professor's section renders regardless of the legacy
  // overview's outcome.
  if (isProgramStaff) {
    return (
      <div className="space-y-4">
        {programStaffSection}
        {staffAssignmentsSection}
      </div>
    );
  }

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
              membershipOverview={membershipEditorOverview}
              membershipTranslations={t.academic.membershipEditor}
              membershipAction={mutateUniversityStudentGroupMembershipAction}
            />
          ) : null}
          {staffAssignmentsSection}
        </div>
      </StructureOverviewShell>
    );
  }
  if (!overview) return <StructureOverviewShell eyebrow={t.common.eyebrow} title={t.academic.title} description={t.academic.description} readOnly={t.common.readOnly}><StructureUnavailable translations={t.common} /></StructureOverviewShell>;
  return (
    <div className="space-y-4">
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
        membershipEditorOverview={membershipEditorOverview}
        membershipAction={isUniversityAdmin ? mutateUniversityStudentGroupMembershipAction : undefined}
      />
      {staffAssignmentsSection}
    </div>
  );
}
