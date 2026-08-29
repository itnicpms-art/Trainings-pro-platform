import { Clock3, ShieldAlert } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import type { ProfileStatus } from "@/types/app";

export function AccountStatusState({ locale, languageLabel, status, translations: t }: { locale: Locale; languageLabel: string; status: ProfileStatus | null; translations: Dictionary["auth"]["accountStatus"] }) {
  const statusMessage = status ? t.statuses[status] ?? t.statuses.unknown : t.statuses.unknown;

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12"><div className="w-full max-w-xl"><div className="mb-8 flex items-center justify-between gap-4"><BrandLogo /><LanguageSwitcher locale={locale} label={languageLabel} /></div><Card className="border-slate-200 shadow-xl shadow-blue-950/5"><CardHeader className="text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">{status ? <Clock3 /> : <ShieldAlert />}</div><CardTitle className="mt-4 text-2xl text-[#06113B]">{t.title}</CardTitle><CardDescription className="text-base leading-6">{t.description}</CardDescription></CardHeader><CardContent className="space-y-5 text-center"><p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{statusMessage}</p><LogoutButton locale={locale} label={t.logout} /></CardContent></Card></div></main>;
}
