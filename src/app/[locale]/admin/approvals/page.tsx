import { ClipboardCheck } from "lucide-react";

import { AdminEmptyState, AdminSection, AdminStatusBadge } from "@/components/admin/admin-console-ui";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { getPlatformAdminOnboardingRequests } from "@/lib/admin/get-admin-data";

export default async function AdminApprovalsPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const [dictionary, requests] = await Promise.all([getDictionary(locale), getPlatformAdminOnboardingRequests()]);
  const t = dictionary.admin.approvals;
  const common = dictionary.admin.common;
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));

  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} /><div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]"><div>{requests === null ? <AdminEmptyState icon={ClipboardCheck} title={common.unavailableTitle} description={common.unavailableDescription} label={common.readOnly} /> : requests.length === 0 ? <AdminEmptyState icon={ClipboardCheck} title={t.emptyTitle} description={t.emptyDescription} label={common.noRecords} /> : <AdminSection title={t.listTitle} description={t.listDescription} badge={common.readOnly}><Table><TableHeader><TableRow><TableHead>{t.flow}</TableHead><TableHead>{t.organization}</TableHead><TableHead>{common.columns.status}</TableHead><TableHead>{common.columns.created}</TableHead></TableRow></TableHeader><TableBody>{requests.map((request) => <TableRow key={request.id}><TableCell className="font-medium text-[#06113B]">{request.flow === "invitation" ? t.invitation : t.representative}</TableCell><TableCell>{request.organization_name ?? t.noOrganization}</TableCell><TableCell><AdminStatusBadge value={request.status} label={common.statuses[request.status]} /></TableCell><TableCell>{formatDate(request.created_at)}</TableCell></TableRow>)}</TableBody></Table></AdminSection>}</div><AdminSection title={t.futureTitle} description={t.listDescription}>{t.futureItems.map((item) => <div key={item} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0"><span className="text-sm font-medium text-[#06113B]">{item}</span><Badge variant="secondary">{common.comingSoon}</Badge></div>)}</AdminSection></div></div>;
}
