import { BadgeCheck, Layers3, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DashboardHeroProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  profileName: string;
  profileLabel: string;
  statusLabel: string;
  shellLabel: string;
  guardrailLabel: string;
  guardrail: string;
  organizationName: string | null;
  organizationLabel: string;
  accent: string;
};

export function DashboardHero({
  eyebrow,
  title,
  subtitle,
  profileName,
  profileLabel,
  statusLabel,
  shellLabel,
  guardrailLabel,
  guardrail,
  organizationName,
  organizationLabel,
  accent,
}: DashboardHeroProps) {
  return (
    <section className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br p-4 text-white shadow-xl shadow-indigo-950/10 sm:p-5", accent)}>
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.22)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="absolute -right-16 -top-24 size-64 rounded-full bg-white/20 blur-3xl" />
      <div className="absolute -bottom-24 left-1/3 size-56 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(240px,.6fr)] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-white/20 bg-white/15 text-white"><Sparkles /> {eyebrow}</Badge>
            <Badge className="border-white/20 bg-slate-950/20 text-white">{shellLabel}</Badge>
          </div>
          <h2 className="mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.035em] sm:text-[2rem]">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-5 text-white/80">{subtitle}</p>
          <div className="mt-3.5 flex flex-wrap gap-1.5 text-[11px] font-medium">
            <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1">{profileName}</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1">{profileLabel}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/30 bg-emerald-300/15 px-2.5 py-1"><BadgeCheck className="size-3" />{statusLabel}</span>
            {organizationName ? <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1">{organizationLabel}: {organizationName}</span> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-slate-950/25 p-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-100"><Layers3 className="size-3.5" />{guardrailLabel}</div>
          <p className="mt-2 text-xs leading-5 text-white/80">{guardrail}</p>
        </div>
      </div>
    </section>
  );
}
