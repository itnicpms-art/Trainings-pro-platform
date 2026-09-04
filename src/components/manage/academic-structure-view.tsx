import { CalendarDays, GraduationCap, Layers3, Landmark, UsersRound } from "lucide-react";

import { AcademicProgramsEditor } from "@/components/manage/academic-programs-editor";
import { AcademicTermsEditor } from "@/components/manage/academic-terms-editor";
import { AcademicUnitsEditor } from "@/components/manage/academic-units-editor";
import { AcademicYearsEditor } from "@/components/manage/academic-years-editor";
import { ContextSummary, StructureNotice, StructureOverviewShell, StructureSection } from "@/components/manage/structure-overview-shell";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import type { AcademicProgramActionState } from "@/lib/manage/mutate-academic-program";
import type { AcademicTermActionState } from "@/lib/manage/mutate-academic-term";
import type { AcademicUnitActionState } from "@/lib/manage/mutate-academic-unit";
import type { AcademicYearActionState } from "@/lib/manage/mutate-academic-year";
import type { AcademicCalendarEditorOverview, AcademicProgramsEditorOverview, AcademicStructureManagementOverview, AcademicUnitsEditorOverview } from "@/types/database";

type MutationAction = (state: AcademicUnitActionState, formData: FormData) => Promise<AcademicUnitActionState>;
type ProgramMutationAction = (state: AcademicProgramActionState, formData: FormData) => Promise<AcademicProgramActionState>;
type YearMutationAction = (state: AcademicYearActionState, formData: FormData) => Promise<AcademicYearActionState>;
type TermMutationAction = (state: AcademicTermActionState, formData: FormData) => Promise<AcademicTermActionState>;

export function AcademicStructureView({
  locale,
  overview,
  translations: t,
  editorOverview,
  editorAction,
  programsEditorOverview,
  programsEditorAction,
  calendarEditorOverview,
  yearAction,
  termAction,
}: {
  locale: Locale;
  overview: AcademicStructureManagementOverview;
  translations: Dictionary["app"]["structureManagement"];
  editorOverview?: AcademicUnitsEditorOverview | null;
  editorAction?: MutationAction;
  programsEditorOverview?: AcademicProgramsEditorOverview | null;
  programsEditorAction?: ProgramMutationAction;
  calendarEditorOverview?: AcademicCalendarEditorOverview | null;
  yearAction?: YearMutationAction;
  termAction?: TermMutationAction;
}) {
  const c = overview.active_context;
  const placeholder = t.common.notAvailable;
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
  const fields = [
    { label: t.common.fields.university, value: c.university_name },
    { label: t.common.fields.faculty, value: c.organization_unit_name ?? placeholder },
    { label: t.common.fields.program, value: c.academic_program_name ?? placeholder },
    { label: t.common.fields.level, value: c.program_level ? t.common.programLevels[c.program_level] : placeholder },
    { label: t.common.fields.year, value: c.academic_year_name ?? c.academic_year_code ?? placeholder },
    { label: t.common.fields.term, value: c.academic_term_name ?? placeholder },
    { label: t.common.fields.group, value: c.academic_group_name ?? c.academic_group_code ?? placeholder },
  ];
  const row = (name: string, meta: string, status: string) => <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0"><div><p className="text-sm font-medium text-[#06113B]">{name}</p><p className="mt-0.5 text-xs text-slate-500">{meta}</p></div><Badge variant="outline">{t.common.statuses[status as keyof typeof t.common.statuses] ?? status}</Badge></div>;
  const editingEnabled = Boolean(editorOverview?.selected_university && editorAction);
  const programsEditingEnabled = Boolean(programsEditorOverview?.selected_university && programsEditorAction);
  const calendarEditingEnabled = Boolean(calendarEditorOverview?.selected_university && yearAction && termAction);

  return <StructureOverviewShell eyebrow={t.common.eyebrow} title={t.academic.title} description={t.academic.description} readOnly={editingEnabled ? t.academic.editor.badge : t.common.readOnly}><div className="space-y-4"><ContextSummary title={t.academic.contextTitle} description={t.academic.contextDescription} fields={fields} />{editingEnabled && editorOverview && editorAction ? <AcademicUnitsEditor locale={locale} overview={editorOverview} translations={t.academic.editor} action={editorAction} /> : <StructureNotice translations={t.common} />}{programsEditingEnabled && programsEditorOverview && programsEditorAction ? <AcademicProgramsEditor locale={locale} overview={programsEditorOverview} levelLabels={t.common.programLevels} translations={t.academic.programsEditor} action={programsEditorAction} /> : null}{calendarEditingEnabled && calendarEditorOverview && yearAction && termAction ? <><AcademicYearsEditor locale={locale} overview={calendarEditorOverview} translations={t.academic.yearsEditor} action={yearAction} /><AcademicTermsEditor locale={locale} overview={calendarEditorOverview} typeLabels={t.common.termTypes} translations={t.academic.termsEditor} action={termAction} /></> : null}<div className="grid gap-4 xl:grid-cols-2">{!editingEnabled ? <StructureSection icon={Landmark} title={t.academic.sections.units} description={t.academic.sectionDescriptions.units} count={overview.organization_units.length} empty={t.common.noData}>{overview.organization_units.map((item) => <div key={item.id}>{row(item.name, `${item.code} · ${t.common.unitTypes[item.unit_type]}`, item.status)}</div>)}</StructureSection> : null}{!programsEditingEnabled ? <StructureSection icon={GraduationCap} title={t.academic.sections.programs} description={t.academic.sectionDescriptions.programs} count={overview.academic_programs.length} empty={t.common.noData}>{overview.academic_programs.map((item) => <div key={item.id}>{row(item.name, `${item.code} · ${t.common.programLevels[item.program_level]}`, item.status)}</div>)}</StructureSection> : null}{!calendarEditingEnabled ? <StructureSection icon={CalendarDays} title={t.academic.sections.years} description={t.academic.sectionDescriptions.years} count={overview.academic_years.length} empty={t.common.noData}>{overview.academic_years.map((item) => <div key={item.id}>{row(item.name, `${item.code} · ${date(item.start_date)} — ${date(item.end_date)}${item.is_current ? ` · ${t.common.current}` : ""}`, item.status)}</div>)}</StructureSection> : null}{!calendarEditingEnabled ? <StructureSection icon={Layers3} title={t.academic.sections.terms} description={t.academic.sectionDescriptions.terms} count={overview.academic_terms.length} empty={t.common.noData}>{overview.academic_terms.map((item) => <div key={item.id}>{row(item.name, `${item.code} · ${date(item.start_date)} — ${date(item.end_date)}`, item.status)}</div>)}</StructureSection> : null}<StructureSection icon={UsersRound} title={t.academic.sections.groups} description={t.academic.sectionDescriptions.groups} count={overview.academic_groups.length} empty={t.common.noData}>{overview.academic_groups.map((item) => <div key={item.id}>{row(item.name, item.code, item.status)}</div>)}</StructureSection></div></div></StructureOverviewShell>;
}
