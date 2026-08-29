import { Building2, KeyRound, ShieldCheck, UsersRound } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";

const summaryMeta = [
  { icon: ShieldCheck, color: "text-blue-700 bg-blue-100" },
  { icon: KeyRound, color: "text-violet-700 bg-violet-100" },
  { icon: Building2, color: "text-cyan-700 bg-cyan-100" },
  { icon: UsersRound, color: "text-emerald-700 bg-emerald-100" },
];

export default async function AdminDashboardPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  const t = dictionary.admin.dashboard;
  const pendingMetric = dictionary.home.metrics.placeholder;

  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} action={<Badge className="bg-blue-100 text-blue-700">{t.phase}</Badge>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{summaryMeta.map(({ icon: Icon, color }, index) => <Card key={t.summary[index]} className="shadow-sm ring-slate-200"><CardContent className="p-5"><div className={`mb-8 flex size-11 items-center justify-center rounded-2xl ${color}`}><Icon /></div><p className="text-xl font-semibold tracking-tight text-[#06113B]">{pendingMetric}</p><p className="mt-1 text-sm text-slate-500">{t.summary[index]}</p></CardContent></Card>)}</div><Card className="mt-6 shadow-sm ring-slate-200"><CardHeader><CardTitle>{t.statusTitle}</CardTitle><CardDescription>{t.statusDescription}</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{t.components.map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4"><span className="size-2 rounded-full bg-emerald-500" /><span className="text-sm font-medium text-[#06113B]">{item}</span></div>)}</CardContent></Card></div>;
}
