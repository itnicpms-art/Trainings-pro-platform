import Link from "next/link";
import { ArrowRight, BadgeCheck, GraduationCap, Infinity as InfinityIcon, RefreshCw, Sparkles } from "lucide-react";

import { CapabilitiesStrip } from "@/components/homepage/capabilities-strip";
import { FuturisticDashboard } from "@/components/homepage/futuristic-dashboard";
import { HomepageMetrics } from "@/components/homepage/homepage-metrics";
import { PlatformModules } from "@/components/homepage/platform-modules";
import { PublicFooter } from "@/components/homepage/public-footer";
import { PublicHeader } from "@/components/homepage/public-header";
import { buttonVariants } from "@/components/ui/button";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { cn } from "@/lib/utils";

const trustIcons = [InfinityIcon, BadgeCheck, GraduationCap, RefreshCw];

export default async function HomePage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  const t = dictionary.home;

  return (
    <main className="min-h-screen overflow-hidden bg-white">
      <PublicHeader locale={locale} translations={t} languageLabel={dictionary.language.label} />

      <section className="relative isolate overflow-hidden bg-[linear-gradient(135deg,#fafdff_0%,#f4f8ff_38%,#faf5ff_100%)]">
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_12%_18%,rgba(37,99,235,0.12),transparent_28%),radial-gradient(circle_at_90%_16%,rgba(192,24,245,0.11),transparent_25%),radial-gradient(circle_at_65%_78%,rgba(34,211,238,0.11),transparent_30%)]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-35 [background-image:linear-gradient(rgba(37,99,235,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.08)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
        <svg aria-hidden="true" className="absolute inset-0 -z-10 size-full opacity-40" viewBox="0 0 1440 850" preserveAspectRatio="none"><path d="M-60 610C230 430 385 775 720 520s510-130 790-340" fill="none" stroke="url(#hero-line)" strokeWidth="1.2" /><path d="M-80 680C250 500 420 840 790 590s490-120 760-330" fill="none" stroke="url(#hero-line)" strokeWidth="0.65" /><defs><linearGradient id="hero-line" x1="0" x2="1"><stop stopColor="#2563eb" stopOpacity="0" /><stop offset="0.5" stopColor="#38bdf8" /><stop offset="1" stopColor="#c026f5" stopOpacity="0" /></linearGradient></defs></svg>

        <div className="mx-auto grid min-h-[760px] max-w-[1480px] items-center gap-16 px-5 py-16 lg:grid-cols-[0.86fr_1.14fr] lg:px-8 lg:py-24 xl:min-h-[850px]">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/75 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 shadow-sm backdrop-blur"><Sparkles className="size-4 text-fuchsia-500" />{t.hero.eyebrow}</div>
            <h1 className="mt-7 text-[clamp(3.7rem,7vw,7.5rem)] font-semibold leading-[0.82] tracking-[-0.07em] text-[#06102d]">
              {t.hero.headline.map((line, index) => <span key={line} className={cn("block", index === 1 && "brand-text pb-[0.08em]", index === 2 && "text-[#121f52]")}>{line}</span>)}
            </h1>
            <p className="mt-8 max-w-xl text-base leading-7 text-slate-600 sm:text-xl sm:leading-8">{t.hero.subtitle}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="#modules" className={cn(buttonVariants({ size: "lg" }), "brand-gradient h-12 px-6 shadow-[0_16px_38px_rgba(37,99,235,0.25)]")}>{t.hero.primaryCta}<ArrowRight className="size-4" /></a>
              <a href="#capabilities" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 border-blue-200 bg-white/70 px-6 text-[#071331] backdrop-blur hover:bg-white")}>{t.hero.secondaryCta}</a>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
              {t.hero.trustIndicators.map((label, index) => { const Icon = trustIcons[index]; return <div key={label} className="flex items-center gap-2.5"><div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white/80 text-blue-700 shadow-sm"><Icon className="size-4" /></div><span className="text-xs font-medium leading-4 text-slate-600">{label}</span></div>; })}
            </div>
            <div className="mt-8 sm:hidden"><Link href={`/${locale}/register`} className={cn(buttonVariants({ variant: "ghost" }), "px-0 text-blue-700")}>{t.register}<ArrowRight /></Link></div>
          </div>

          <FuturisticDashboard translations={t.dashboard} />
        </div>
      </section>

      <PlatformModules translations={t.modules} />
      <CapabilitiesStrip translations={t.capabilities} />
      <HomepageMetrics locale={locale} translations={t.metrics} />
      <PublicFooter locale={locale} translations={t.footer} languageLabel={dictionary.language.label} />
    </main>
  );
}
