import Link from "next/link";
import { ShieldX } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import { cn } from "@/lib/utils";

export function AdminRestrictedState({ locale, languageLabel, logoutLabel, translations: t }: { locale: Locale; languageLabel: string; logoutLabel: string; translations: Dictionary["admin"]["restricted"] }) {
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12"><div className="w-full max-w-xl"><div className="mb-8 flex items-center justify-between gap-4"><BrandLogo /><LanguageSwitcher locale={locale} label={languageLabel} /></div><Card className="border-slate-200 shadow-xl shadow-blue-950/5"><CardHeader className="text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700"><ShieldX /></div><CardTitle className="mt-4 text-2xl text-[#06113B]">{t.title}</CardTitle><CardDescription className="text-base leading-6">{t.description}</CardDescription></CardHeader><CardContent className="flex flex-col items-center justify-center gap-3 sm:flex-row"><Link href={`/${locale}/app`} className={cn(buttonVariants(), "brand-gradient")}>{t.backToApp}</Link><LogoutButton locale={locale} label={logoutLabel} /></CardContent></Card></div></main>;
}
