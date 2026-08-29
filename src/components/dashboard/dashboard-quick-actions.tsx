import { ArrowRight, Home, Settings, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

type QuickActionTranslations = {
  title: string;
  description: string;
  profiles: string;
  settings: string;
  homepage: string;
  admin: string;
  future: string;
};

export function DashboardQuickActions({ locale, translations: t, futureLabel, comingSoon, canAccessAdmin }: { locale: Locale; translations: QuickActionTranslations; futureLabel: string; comingSoon: string; canAccessAdmin: boolean }) {
  const actions = [
    { href: `/${locale}/app/profiles`, label: t.profiles, icon: UsersRound },
    { href: `/${locale}/app/settings`, label: t.settings, icon: Settings },
    { href: `/${locale}`, label: t.homepage, icon: Home },
    ...(canAccessAdmin ? [{ href: `/${locale}/admin`, label: t.admin, icon: ShieldCheck }] : []),
  ];

  return (
    <Card className="rounded-2xl bg-white shadow-sm ring-slate-200/80">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {actions.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn(buttonVariants({ variant: "outline" }), "h-10 justify-between rounded-xl px-3")}><span className="inline-flex items-center gap-2"><Icon className="size-4 text-indigo-600" />{label}</span><ArrowRight className="size-4 text-slate-400" /></Link>)}
        <div aria-disabled="true" className="flex h-10 items-center justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
          <span className="truncate">{t.future}: {futureLabel}</span><Badge variant="secondary">{comingSoon}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
