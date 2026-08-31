import Link from "next/link";
import { ArrowUpRight, BarChart3, Building2, ClipboardCheck, FileClock, Globe2, GraduationCap, KeyRound, LibraryBig, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";

import { AdminMetricCard, AdminSection } from "@/components/admin/admin-console-ui";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { getPlatformAdminOverview } from "@/lib/admin/get-admin-data";

export default async function AdminDashboardPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const [dictionary, overview] = await Promise.all([getDictionary(locale), getPlatformAdminOverview()]);
  const t = dictionary.admin.dashboard;
  const pending = dictionary.admin.common.comingSoon;
  const metrics = [
    { icon: UsersRound, label: t.metrics.activeProfiles, value: overview?.active_profiles ?? pending, accent: "blue" as const },
    { icon: Building2, label: t.metrics.organizations, value: overview?.organizations ?? pending, accent: "cyan" as const },
    { icon: ShieldCheck, label: t.metrics.roles, value: overview?.roles ?? pending, accent: "violet" as const },
    { icon: KeyRound, label: t.metrics.permissions, value: overview?.permissions ?? pending, accent: "emerald" as const },
    { icon: ClipboardCheck, label: t.metrics.pendingApprovals, value: overview?.pending_approvals ?? pending, accent: "amber" as const },
  ];
  const areas = [
    { icon: Building2, label: t.areas.organizations, href: `/${locale}/admin/organizations`, ready: true },
    { icon: UsersRound, label: t.areas.users, href: `/${locale}/admin/users`, ready: true },
    { icon: ShieldCheck, label: t.areas.roles, href: `/${locale}/admin/roles`, ready: true },
    { icon: LockKeyhole, label: t.areas.security, href: `/${locale}/admin/security`, ready: true },
    { icon: FileClock, label: t.areas.audit, href: `/${locale}/admin/audit`, ready: false },
    { icon: Globe2, label: t.areas.website, href: `/${locale}/admin/website`, ready: false },
    { icon: ClipboardCheck, label: t.areas.approvals, href: `/${locale}/admin/approvals`, ready: true },
    { icon: LibraryBig, label: t.areas.content, href: `/${locale}/admin/content`, ready: false },
    { icon: GraduationCap, label: t.areas.certificates, ready: false },
    { icon: BarChart3, label: t.areas.reporting, ready: false },
  ];

  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} action={<Badge className="bg-blue-100 text-blue-700">{t.phase}</Badge>} /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">{metrics.map((item) => <AdminMetricCard key={item.label} {...item} />)}</div><div className="mt-5"><AdminSection title={t.areasTitle} description={t.areasDescription} badge={dictionary.admin.common.readOnly}><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{areas.map(({ icon: Icon, label, href, ready }) => { const content = <><span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-violet-100 text-blue-700"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#06113B]">{label}</p>{!ready && <p className="mt-1 text-xs text-slate-500">{pending}</p>}</div>{href && <ArrowUpRight className="size-4 text-slate-400" />}</>; return href ? <Link key={label} href={href} className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/50">{content}</Link> : <div key={label} className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 p-3">{content}</div>; })}</div></AdminSection></div></div>;
}
