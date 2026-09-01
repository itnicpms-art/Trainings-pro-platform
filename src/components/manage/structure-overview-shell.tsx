import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { LockKeyhole } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import { cn } from "@/lib/utils";

type CommonTranslations = Dictionary["app"]["structureManagement"]["common"];

export function StructureOverviewShell({ eyebrow, title, description, readOnly, children }: { eyebrow: string; title: string; description: string; readOnly: string; children: ReactNode }) {
  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow={eyebrow} title={title} description={description} action={<Badge className="bg-blue-100 text-blue-700">{readOnly}</Badge>} />{children}</div>;
}

export function StructureSection({ icon: Icon, title, description, count, empty, children }: { icon: LucideIcon; title: string; description: string; count: number; empty: string; children: ReactNode }) {
  return <Card className="shadow-sm ring-slate-200"><CardHeader className="border-b border-slate-100"><div className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><Icon className="size-4" /></span><div><CardTitle>{title}</CardTitle><CardDescription className="mt-1">{description}</CardDescription></div></div></CardHeader><CardContent>{count ? children : <p className="py-6 text-center text-sm text-slate-500">{empty}</p>}</CardContent></Card>;
}

export function StructureNotice({ translations: t }: { translations: CommonTranslations }) {
  return <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4"><p className="text-sm font-semibold text-blue-900">{t.editableFuture}</p><p className="mt-1 text-xs leading-5 text-blue-700">{t.actionsDisabled}</p></div>;
}

export function StructureUnavailable({ translations: t }: { translations: CommonTranslations }) {
  return <Card className="shadow-sm ring-slate-200"><CardContent className="flex min-h-56 flex-col items-center justify-center text-center"><LockKeyhole className="size-8 text-slate-400" /><p className="mt-4 font-semibold text-[#06113B]">{t.unavailableTitle}</p><p className="mt-2 max-w-xl text-sm text-slate-500">{t.noData}</p><Badge variant="secondary" className="mt-4">{t.readOnly}</Badge></CardContent></Card>;
}

export function StructureRestricted({ locale, translations: t }: { locale: Locale; translations: CommonTranslations }) {
  return <div className="mx-auto max-w-2xl"><Card className="shadow-sm ring-slate-200"><CardContent className="flex min-h-72 flex-col items-center justify-center px-6 text-center"><LockKeyhole className="size-10 text-rose-600" /><h2 className="mt-4 text-xl font-semibold text-[#06113B]">{t.restrictedTitle}</h2><p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">{t.restrictedDescription}</p><Link href={`/${locale}/app`} className={cn(buttonVariants(), "mt-5 brand-gradient")}>{t.backHome}</Link></CardContent></Card></div>;
}

export function ContextSummary({ title, description, fields }: { title: string; description: string; fields: Array<{ label: string; value: string }> }) {
  return <Card className="bg-gradient-to-br from-[#06113B] to-indigo-900 text-white shadow-lg ring-0"><CardHeader><CardTitle className="text-white">{title}</CardTitle><CardDescription className="text-blue-100/75">{description}</CardDescription></CardHeader><CardContent><dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{fields.map((field) => <div key={field.label} className="rounded-xl border border-white/10 bg-white/5 p-3"><dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-200/70">{field.label}</dt><dd className="mt-1 text-sm font-medium text-white">{field.value}</dd></div>)}</dl></CardContent></Card>;
}
