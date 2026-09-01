import { Building2, CalendarDays } from "lucide-react";

import { ContextSummary, StructureNotice, StructureOverviewShell, StructureSection } from "@/components/manage/structure-overview-shell";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import type { OrganizationStructureManagementOverview } from "@/types/database";

export function OrganizationStructureView({ locale, overview, translations: t }: { locale: Locale; overview: OrganizationStructureManagementOverview; translations: Dictionary["app"]["structureManagement"] }) {
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
  const current = overview.training_periods.find((period) => period.is_current);
  const fields = [
    { label: t.common.fields.organization, value: overview.organization_name },
    { label: t.common.fields.organizationType, value: t.common.organizationTypes[overview.organization_type] },
    { label: t.common.fields.status, value: t.common.statuses[overview.organization_status] },
    { label: t.organization.sections.current, value: current?.name ?? t.common.notAvailable },
  ];

  return <StructureOverviewShell eyebrow={t.common.eyebrow} title={t.organization.title} description={t.organization.description} readOnly={t.common.readOnly}><div className="space-y-4"><ContextSummary title={t.organization.summaryTitle} description={t.organization.summaryDescription} fields={fields} /><StructureNotice translations={t.common} /><div className="grid gap-4 lg:grid-cols-2"><StructureSection icon={Building2} title={t.organization.sections.organization} description={t.organization.sectionDescriptions.organization} count={1} empty={t.common.noData}><div className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium text-[#06113B]">{overview.organization_name}</p><p className="mt-0.5 text-xs text-slate-500">{t.common.organizationTypes[overview.organization_type]}</p></div><Badge variant="outline">{t.common.statuses[overview.organization_status]}</Badge></div></StructureSection><StructureSection icon={CalendarDays} title={t.organization.sections.periods} description={t.organization.sectionDescriptions.periods} count={overview.training_periods.length} empty={t.common.noData}>{overview.training_periods.map((period) => <div key={period.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0"><div><p className="text-sm font-medium text-[#06113B]">{period.name}</p><p className="mt-0.5 text-xs text-slate-500">{period.code} · {date(period.start_date)} — {date(period.end_date)}</p></div><div className="flex gap-2">{period.is_current ? <Badge className="bg-emerald-100 text-emerald-700">{t.common.current}</Badge> : null}<Badge variant="outline">{t.common.statuses[period.status]}</Badge></div></div>)}</StructureSection></div></div></StructureOverviewShell>;
}
