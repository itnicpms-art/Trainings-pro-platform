import { CalendarDays, GraduationCap, Layers3, Landmark, UsersRound } from "lucide-react";

import { ContextSummary, StructureNotice, StructureOverviewShell, StructureSection } from "@/components/manage/structure-overview-shell";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import type { AcademicStructureManagementOverview } from "@/types/database";

export function AcademicStructureView({ locale, overview, translations: t }: { locale: Locale; overview: AcademicStructureManagementOverview; translations: Dictionary["app"]["structureManagement"] }) {
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

  return <StructureOverviewShell eyebrow={t.common.eyebrow} title={t.academic.title} description={t.academic.description} readOnly={t.common.readOnly}><div className="space-y-4"><ContextSummary title={t.academic.contextTitle} description={t.academic.contextDescription} fields={fields} /><StructureNotice translations={t.common} /><div className="grid gap-4 xl:grid-cols-2"><StructureSection icon={Landmark} title={t.academic.sections.units} description={t.academic.sectionDescriptions.units} count={overview.organization_units.length} empty={t.common.noData}>{overview.organization_units.map((item) => <div key={item.id}>{row(item.name, `${item.code} · ${t.common.unitTypes[item.unit_type]}`, item.status)}</div>)}</StructureSection><StructureSection icon={GraduationCap} title={t.academic.sections.programs} description={t.academic.sectionDescriptions.programs} count={overview.academic_programs.length} empty={t.common.noData}>{overview.academic_programs.map((item) => <div key={item.id}>{row(item.name, `${item.code} · ${t.common.programLevels[item.program_level]}`, item.status)}</div>)}</StructureSection><StructureSection icon={CalendarDays} title={t.academic.sections.years} description={t.academic.sectionDescriptions.years} count={overview.academic_years.length} empty={t.common.noData}>{overview.academic_years.map((item) => <div key={item.id}>{row(item.name, `${item.code} · ${date(item.start_date)} — ${date(item.end_date)}${item.is_current ? ` · ${t.common.current}` : ""}`, item.status)}</div>)}</StructureSection><StructureSection icon={Layers3} title={t.academic.sections.terms} description={t.academic.sectionDescriptions.terms} count={overview.academic_terms.length} empty={t.common.noData}>{overview.academic_terms.map((item) => <div key={item.id}>{row(item.name, `${item.code} · ${date(item.start_date)} — ${date(item.end_date)}`, item.status)}</div>)}</StructureSection><StructureSection icon={UsersRound} title={t.academic.sections.groups} description={t.academic.sectionDescriptions.groups} count={overview.academic_groups.length} empty={t.common.noData}>{overview.academic_groups.map((item) => <div key={item.id}>{row(item.name, item.code, item.status)}</div>)}</StructureSection></div></div></StructureOverviewShell>;
}
