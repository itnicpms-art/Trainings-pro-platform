import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";

export function PublicFooter({ locale, translations: t, languageLabel }: { locale: Locale; translations: Dictionary["home"]["footer"]; languageLabel: string }) {
  const year = new Date().getFullYear();
  return (
    <footer id="contact" className="scroll-mt-28 bg-[#030a20] text-white">
      <div className="mx-auto max-w-[1480px] px-5 py-16 lg:px-8 lg:py-20"><div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]"><div><BrandLogo inverted /><p className="mt-6 max-w-md text-sm leading-7 text-blue-100/55">{t.description}</p><div className="mt-7"><LanguageSwitcher locale={locale} label={languageLabel} inverted /></div></div><div className="grid grid-cols-2 gap-8 sm:grid-cols-4">{t.columns.map((column) => <div key={column.title}><h2 className="text-sm font-semibold text-white">{column.title}</h2><ul className="mt-4 space-y-3">{column.links.map((link) => <li key={link}><a href="#modules" className="text-sm text-blue-100/45 transition-colors hover:text-cyan-300">{link}</a></li>)}</ul></div>)}<div><h2 className="text-sm font-semibold text-white">{t.contactTitle}</h2><p className="mt-4 text-sm leading-6 text-blue-100/45">{t.contactPlaceholder}</p></div></div></div><div className="mt-14 border-t border-white/10 pt-6 text-xs text-blue-100/35">© {year} {t.copyright}</div></div>
    </footer>
  );
}
