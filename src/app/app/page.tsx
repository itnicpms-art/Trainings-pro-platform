import { ArrowRight, Building2, ShieldCheck, UserRoundCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/page-heading";
import { cn } from "@/lib/utils";

const summary = [
  { label: "Profile active", value: "1", icon: UsersRound, tone: "bg-blue-100 text-blue-700" },
  { label: "Organizații", value: "0", icon: Building2, tone: "bg-violet-100 text-violet-700" },
  { label: "Rol curent", value: "Member", icon: ShieldCheck, tone: "bg-cyan-100 text-cyan-700" },
];

export default function MemberDashboardPage() {
  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow="Dashboard" title="Bun venit în spațiul tău" description="Gestionează profilurile și preferințele contului din fundația Trainings PRO." action={<Badge className="bg-emerald-100 text-emerald-700">Fundație activă</Badge>} /><div className="grid gap-4 sm:grid-cols-3">{summary.map(({ label, value, icon: Icon, tone }) => <Card key={label} className="shadow-sm ring-slate-200"><CardContent className="flex items-center gap-4 p-5"><div className={cn("flex size-11 items-center justify-center rounded-2xl", tone)}><Icon /></div><div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold text-[#06113B]">{value}</p></div></CardContent></Card>)}</div><div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]"><Card className="shadow-sm ring-slate-200"><CardHeader><CardTitle>Profilul implicit</CardTitle><CardDescription>Profilul creat automat la înregistrare.</CardDescription></CardHeader><CardContent><div className="flex flex-col gap-5 rounded-2xl bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white"><UserRoundCheck /></div><div><div className="flex items-center gap-2"><p className="font-semibold text-[#06113B]">Individual Member</p><Badge variant="secondary">Implicit</Badge></div><p className="mt-1 text-sm text-slate-500">Profil individual · Activ</p></div></div><Link href="/app/profiles" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>Vezi profilele <ArrowRight /></Link></div></CardContent></Card><Card className="brand-gradient shadow-xl shadow-blue-900/10 ring-0"><CardHeader><CardTitle className="text-white">Acces protejat</CardTitle><CardDescription className="text-blue-100/75">Datele sunt delimitate prin politicile Supabase RLS.</CardDescription></CardHeader><CardContent><div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4"><ShieldCheck className="text-cyan-300" /><p className="text-sm text-blue-50">Rolurile și permisiunile sunt evaluate în contextul profilului activ.</p></div></CardContent></Card></div></div>;
}
