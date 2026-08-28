import Link from "next/link";
import { Search } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import { cn } from "@/lib/utils";

export function PublicHeader({ locale, translations: t, languageLabel }: { locale: Locale; translations: Dictionary["home"]; languageLabel: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex min-h-18 max-w-[1480px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href={`/${locale}`} aria-label={t.brandLabel}><BrandLogo compact /></Link>
        <nav className="hidden items-center gap-5 xl:flex" aria-label={t.navigationLabel}>
          {t.navigation.map((item) => <a key={item.label} href={item.href} className="text-sm font-medium text-slate-600 transition-colors hover:text-blue-700">{item.label}</a>)}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button type="button" aria-label={t.search} className="hidden size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-700 sm:inline-flex"><Search className="size-4" /></button>
          <LanguageSwitcher locale={locale} label={languageLabel} />
          <Link href={`/${locale}/login`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden md:inline-flex")}>{t.login}</Link>
          <Link href={`/${locale}/register`} className={cn(buttonVariants({ size: "sm" }), "brand-gradient hidden shadow-lg shadow-blue-600/20 sm:inline-flex")}>{t.register}</Link>
        </div>
      </div>
      <nav className="mx-auto flex max-w-[1480px] gap-5 overflow-x-auto px-4 pb-3 text-sm font-medium text-slate-600 [scrollbar-width:none] xl:hidden" aria-label={t.navigationLabel}>
        {t.navigation.map((item) => <a key={item.label} href={item.href} className="shrink-0 hover:text-blue-700">{item.label}</a>)}
      </nav>
    </header>
  );
}
