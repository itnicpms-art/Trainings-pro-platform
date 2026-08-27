import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AuthShellProps = { title: string; description: string; children: ReactNode };

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1fr_1.05fr]">
      <section className="flex items-center justify-center px-5 py-12 sm:px-10"><div className="w-full max-w-md"><Link href="/" className="mb-12 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700"><ArrowLeft className="size-4" /> Înapoi la pagina principală</Link><BrandLogo className="mb-10" /><Card className="gap-6 border-0 py-0 shadow-none ring-0"><CardHeader className="px-0"><CardTitle className="text-3xl font-semibold tracking-tight text-[#06113B]">{title}</CardTitle><CardDescription className="text-base leading-6">{description}</CardDescription></CardHeader><CardContent className="px-0">{children}</CardContent></Card></div></section>
      <aside className="relative hidden overflow-hidden bg-[#06113B] p-12 text-white lg:flex lg:flex-col lg:justify-between"><div className="absolute -right-32 -top-32 size-[28rem] rounded-full bg-cyan-400/20 blur-3xl" /><div className="absolute -bottom-44 -left-24 size-[30rem] rounded-full bg-fuchsia-500/20 blur-3xl" /><div className="relative"><div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-300"><ShieldCheck /></div><h2 className="mt-10 max-w-lg text-4xl font-semibold leading-tight">Un singur cont. Mai multe profiluri. Accesul potrivit.</h2><p className="mt-5 max-w-lg text-lg leading-8 text-blue-100/70">Fundația Trainings PRO păstrează fiecare identitate și apartenență organizațională într-un context clar și securizat.</p></div><div className="relative grid gap-4 sm:grid-cols-2">{["Profil individual creat automat", "Date protejate prin Supabase RLS", "Roluri și permisiuni granulare", "Pregătit pentru dezvoltare modulară"].map((item) => <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-blue-50"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-cyan-300" />{item}</div>)}</div></aside>
    </main>
  );
}
