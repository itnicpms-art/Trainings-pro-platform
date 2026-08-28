import { ArrowRight, Building2, ShieldCheck, UserRoundCheck, UsersRound } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/page-heading";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { cn } from "@/lib/utils";

const summaryMeta = [
  { value: "1", icon: UsersRound, tone: "bg-blue-100 text-blue-700" },
  { value: "0", icon: Building2, tone: "bg-violet-100 text-violet-700" },
  { value: null, icon: ShieldCheck, tone: "bg-cyan-100 text-cyan-700" },
];

export default async function MemberDashboardPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  const t = dictionary.app.dashboard;

  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} action={<Badge className="bg-emerald-100 text-emerald-700">{t.status}</Badge>} /><div className="grid gap-4 sm:grid-cols-3">{summaryMeta.map(({ value, icon: Icon, tone }, index) => <Card key={t.summary[index]} className="shadow-sm ring-slate-200"><CardContent className="flex items-center gap-4 p-5"><div className={cn("flex size-11 items-center justify-center rounded-2xl", tone)}><Icon /></div><div><p className="text-sm text-slate-500">{t.summary[index]}</p><p className="mt-1 text-xl font-semibold text-[#06113B]">{value ?? t.member}</p></div></CardContent></Card>)}</div><div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]"><Card className="shadow-sm ring-slate-200"><CardHeader><CardTitle>{t.defaultProfileTitle}</CardTitle><CardDescription>{t.defaultProfileDescription}</CardDescription></CardHeader><CardContent><div className="flex flex-col gap-5 rounded-2xl bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white"><UserRoundCheck /></div><div><div className="flex items-center gap-2"><p className="font-semibold text-[#06113B]">{t.memberRole}</p><Badge variant="secondary">{t.default}</Badge></div><p className="mt-1 text-sm text-slate-500">{t.profileStatus}</p></div></div><Link href={`/${locale}/app/profiles`} className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>{t.viewProfiles} <ArrowRight /></Link></div></CardContent></Card><Card className="brand-gradient shadow-xl shadow-blue-900/10 ring-0"><CardHeader><CardTitle className="text-white">{t.protectedTitle}</CardTitle><CardDescription className="text-blue-100/75">{t.protectedDescription}</CardDescription></CardHeader><CardContent><div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4"><ShieldCheck className="text-cyan-300" /><p className="text-sm text-blue-50">{t.protectedDetail}</p></div></CardContent></Card></div></div>;
}
