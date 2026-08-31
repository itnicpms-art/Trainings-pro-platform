import { Building2 } from "lucide-react";

import { AdminEmptyState, AdminSection, AdminStatusBadge } from "@/components/admin/admin-console-ui";
import { PageHeading } from "@/components/page-heading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { getPlatformAdminOrganizations } from "@/lib/admin/get-admin-data";

export default async function AdminOrganizationsPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const [dictionary, organizations] = await Promise.all([getDictionary(locale), getPlatformAdminOrganizations()]);
  const t = dictionary.admin.organizations;
  const common = dictionary.admin.common;
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));

  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />{organizations === null ? <AdminEmptyState icon={Building2} title={common.unavailableTitle} description={common.unavailableDescription} label={common.readOnly} /> : organizations.length === 0 ? <AdminEmptyState icon={Building2} title={t.emptyTitle} description={t.emptyDescription} label={common.noRecords} /> : <AdminSection title={t.listTitle} description={t.listDescription} badge={common.readOnly}><Table><TableHeader><TableRow><TableHead>{common.columns.name}</TableHead><TableHead>{common.columns.type}</TableHead><TableHead>{common.columns.status}</TableHead><TableHead>{common.columns.created}</TableHead></TableRow></TableHeader><TableBody>{organizations.map((organization) => <TableRow key={organization.id}><TableCell><p className="font-medium text-[#06113B]">{organization.name}</p><p className="text-xs text-slate-500">{organization.slug}</p></TableCell><TableCell>{common.organizationTypes[organization.organization_type]}</TableCell><TableCell><AdminStatusBadge value={organization.status} label={common.statuses[organization.status]} /></TableCell><TableCell>{formatDate(organization.created_at)}</TableCell></TableRow>)}</TableBody></Table></AdminSection>}</div>;
}
