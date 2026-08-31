import { AlertTriangle, KeyRound, ShieldCheck } from "lucide-react";

import { AdminEmptyState, AdminSection } from "@/components/admin/admin-console-ui";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { getPlatformAdminRoleGovernance } from "@/lib/admin/get-admin-data";

export default async function AdminRolesPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const [dictionary, governance] = await Promise.all([getDictionary(locale), getPlatformAdminRoleGovernance()]);
  const t = dictionary.admin.roles;
  const common = dictionary.admin.common;

  if (!governance) return <div className="mx-auto max-w-7xl"><PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} /><AdminEmptyState icon={ShieldCheck} title={common.unavailableTitle} description={common.unavailableDescription} label={common.readOnly} /></div>;

  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} /><div className="grid gap-5 xl:grid-cols-2"><AdminSection title={t.rolesTitle} description={t.rolesDescription} badge={common.readOnly}><Table><TableHeader><TableRow><TableHead>{common.columns.code}</TableHead><TableHead>{common.columns.scope}</TableHead><TableHead>{common.columns.permissions}</TableHead></TableRow></TableHeader><TableBody>{governance.roles.map((role) => { const grants = governance.grants.filter((grant) => grant.role_id === role.id && grant.allowed); return <TableRow key={role.id}><TableCell><p className="font-medium text-[#06113B]">{role.name}</p><p className="text-xs text-slate-500">{role.code}</p></TableCell><TableCell><Badge variant="outline">{common.scopes[role.scope]}</Badge></TableCell><TableCell>{grants.length} {t.grants}</TableCell></TableRow>; })}</TableBody></Table></AdminSection><AdminSection title={t.permissionsTitle} description={t.permissionsDescription} badge={common.readOnly}>{governance.permissions.length === 0 ? <AdminEmptyState icon={KeyRound} title={common.noRecords} description={t.permissionsDescription} label={common.readOnly} /> : <div className="grid gap-2 sm:grid-cols-2">{governance.permissions.map((permission) => { const grants = governance.grants.filter((grant) => grant.permission_id === permission.id && grant.allowed); return <div key={permission.id} className="rounded-xl border border-slate-200 p-3"><p className="font-mono text-xs font-semibold text-blue-700">{permission.code}</p><p className="mt-2 text-xs text-slate-500">{grants.length} {t.grants}</p>{grants.some((grant) => grant.approval_required) && <Badge variant="secondary" className="mt-2">{t.approvalRequired}</Badge>}</div>; })}</div>}</AdminSection></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><AdminSection title={t.scopeTitle} description={t.rolesDescription}>{t.scopeNotes.map((note) => <p key={note} className="border-b border-slate-100 py-2 text-sm text-slate-600 last:border-0">{note}</p>)}</AdminSection><div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><p>{t.warning}</p></div></div></div>;
}
