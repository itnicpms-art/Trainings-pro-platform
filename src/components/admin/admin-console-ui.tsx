import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AdminMetricCard({ icon: Icon, label, value, accent = "blue" }: { icon: LucideIcon; label: string; value: string | number; accent?: "blue" | "violet" | "cyan" | "emerald" | "amber" | "rose" }) {
  const accents = {
    blue: "bg-blue-100 text-blue-700",
    violet: "bg-violet-100 text-violet-700",
    cyan: "bg-cyan-100 text-cyan-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  };

  return <Card size="sm" className="shadow-sm ring-slate-200"><CardContent className="flex items-center gap-4 px-4"><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", accents[accent])}><Icon className="size-5" /></span><div className="min-w-0"><p className="text-xl font-semibold tracking-tight text-[#06113B]">{value}</p><p className="truncate text-xs text-slate-500">{label}</p></div></CardContent></Card>;
}

export function AdminSection({ title, description, children, badge }: { title: string; description: string; children: ReactNode; badge?: string }) {
  return <Card className="shadow-sm ring-slate-200"><CardHeader className="border-b border-slate-100"><div className="flex items-start justify-between gap-4"><div><CardTitle>{title}</CardTitle><CardDescription className="mt-1">{description}</CardDescription></div>{badge && <Badge variant="secondary">{badge}</Badge>}</div></CardHeader><CardContent>{children}</CardContent></Card>;
}

export function AdminEmptyState({ icon: Icon, title, description, label }: { icon: LucideIcon; title: string; description: string; label: string }) {
  return <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center"><span className="flex size-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><Icon className="size-5" /></span><h2 className="mt-4 font-heading text-lg font-semibold text-[#06113B]">{title}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p><Badge variant="secondary" className="mt-4">{label}</Badge></div>;
}

export function AdminStatusBadge({ value, label }: { value: string; label: string }) {
  const active = value === "active" || value === "approved";
  const pending = value.startsWith("pending");
  return <Badge variant="outline" className={cn(active && "border-emerald-200 bg-emerald-50 text-emerald-700", pending && "border-amber-200 bg-amber-50 text-amber-700")}>{label}</Badge>;
}
