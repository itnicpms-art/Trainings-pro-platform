import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Layers3, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { cn } from "@/lib/utils";

const foundationIcons = [UsersRound, Building2, ShieldCheck];

export default async function HomePage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  const t = dictionary.home;

  return (
    <main className="min-h-screen overflow-hidden bg-white">
      <header className="relative z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-5 lg:px-8">
          <BrandLogo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex" aria-label={t.navigationLabel}>
            <a href="#platforma" className="transition-colors hover:text-blue-700">{t.navigation[0]}</a>
            <a href="#fundatie" className="transition-colors hover:text-blue-700">{t.navigation[1]}</a>
            <a href="#securitate" className="transition-colors hover:text-blue-700">{t.navigation[2]}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher locale={locale} label={dictionary.language.label} />
            <Link href={`/${locale}/login`} className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "hidden sm:inline-flex")}>{t.login}</Link>
            <Link href={`/${locale}/register`} className={cn(buttonVariants({ size: "lg" }), "brand-gradient hidden px-5 shadow-lg shadow-blue-600/20 sm:inline-flex")}>{t.register}</Link>
          </div>
        </div>
      </header>

      <section id="platforma" className="relative isolate">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_20%,rgba(24,229,240,0.15),transparent_28%),radial-gradient(circle_at_20%_30%,rgba(192,24,245,0.09),transparent_25%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700"><Sparkles className="size-4" /> {t.badge}</div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-[#06113B] sm:text-6xl lg:text-7xl">{t.titleBefore} <span className="brand-text">{t.titleAccent}</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">{t.description}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={`/${locale}/register`} className={cn(buttonVariants({ size: "lg" }), "brand-gradient h-11 px-6 shadow-xl shadow-blue-600/20")}>{t.start} <ArrowRight /></Link>
              <Link href={`/${locale}/app`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-6")}>{t.workspace}</Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
              {t.benefits.map((item) => <span key={item} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-500" />{item}</span>)}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-cyan-300/30 via-blue-400/20 to-fuchsia-400/30 blur-3xl" />
            <div className="rounded-[2rem] border border-white/80 bg-white/90 p-3 shadow-[0_30px_90px_rgba(6,17,59,0.16)] backdrop-blur">
              <div className="rounded-[1.4rem] bg-[#06113B] p-6 text-white">
                <div className="flex items-center justify-between"><span className="text-sm font-medium text-cyan-200">{t.previewTitle}</span><Layers3 className="size-5 text-cyan-300" /></div>
                <h2 className="mt-12 text-3xl font-semibold">{t.previewWelcome}</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-blue-100/80">{t.previewDescription}</p>
              </div>
              <div className="grid gap-3 p-3 sm:grid-cols-2">
                <Card className="border-0 bg-slate-50 shadow-none ring-0"><CardContent className="p-5"><div className="mb-8 flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><UsersRound /></div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t.activeProfile}</p><p className="mt-1 text-base font-semibold text-[#06113B]">{t.memberRole}</p></CardContent></Card>
                <Card className="border-0 bg-slate-50 shadow-none ring-0"><CardContent className="p-5"><div className="mb-8 flex size-10 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-700"><ShieldCheck /></div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t.security}</p><p className="mt-1 text-base font-semibold text-[#06113B]">{t.protectedAccess}</p></CardContent></Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="fundatie" className="border-y border-slate-200 bg-slate-50/80 py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">{t.foundationEyebrow}</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#06113B] sm:text-4xl">{t.foundationTitle}</h2></div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {t.foundations.map(({ title, description }, index) => {
              const Icon = foundationIcons[index];
              return <Card key={title} className="bg-white py-0 shadow-sm ring-slate-200 transition-transform hover:-translate-y-1"><CardContent className="p-7"><div className="flex items-center justify-between"><div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-violet-100 text-blue-700"><Icon /></div><span className="text-sm font-semibold text-slate-300">0{index + 1}</span></div><h3 className="mt-8 text-xl font-semibold text-[#06113B]">{title}</h3><p className="mt-3 leading-7 text-slate-600">{description}</p></CardContent></Card>;
            })}
          </div>
        </div>
      </section>

      <footer id="securitate" className="bg-[#06113B] text-white"><div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 sm:flex-row sm:items-center sm:justify-between lg:px-8"><BrandLogo inverted /><div className="flex flex-col items-start gap-4 sm:items-end"><LanguageSwitcher locale={locale} label={dictionary.language.label} inverted /><p className="max-w-md text-sm leading-6 text-blue-100/70">{t.footer}</p></div></div></footer>
    </main>
  );
}
