import { Building2, KeyRound, ShieldCheck, UsersRound } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const foundation = [
  { label: "Tipuri de rol", value: "10", icon: ShieldCheck, color: "text-blue-700 bg-blue-100" },
  { label: "Permisiuni seed", value: "28", icon: KeyRound, color: "text-violet-700 bg-violet-100" },
  { label: "Organizații", value: "0", icon: Building2, color: "text-cyan-700 bg-cyan-100" },
  { label: "Profile", value: "0", icon: UsersRound, color: "text-emerald-700 bg-emerald-100" },
];

export default function AdminDashboardPage() {
  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow="Platform admin" title="Fundația administrativă" description="Vizualizare inițială pentru modelul de profile, organizații, roluri și permisiuni." action={<Badge className="bg-blue-100 text-blue-700">Phase 1</Badge>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{foundation.map(({ label, value, icon: Icon, color }) => <Card key={label} className="shadow-sm ring-slate-200"><CardContent className="p-5"><div className={`mb-8 flex size-11 items-center justify-center rounded-2xl ${color}`}><Icon /></div><p className="text-3xl font-semibold tracking-tight text-[#06113B]">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></CardContent></Card>)}</div><Card className="mt-6 shadow-sm ring-slate-200"><CardHeader><CardTitle>Starea fundației</CardTitle><CardDescription>Componentele de bază definite în migrarea 001.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{["Supabase Auth", "Profile multiple", "Roluri & permisiuni", "Row Level Security"].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4"><span className="size-2 rounded-full bg-emerald-500" /><span className="text-sm font-medium text-[#06113B]">{item}</span></div>)}</CardContent></Card></div>;
}
