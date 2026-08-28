import Link from "next/link";
import Image from "next/image";
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

      <section className="relative isolate overflow-hidden">
        <Image
          src="/images/home/futuristic-education-bg.png"
          alt=""
          fill
          preload
          sizes="100vw"
          className="-z-30 object-cover object-[58%_center] opacity-75 sm:object-[64%_center] lg:object-[72%_center]"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-gradient-to-r from-white via-white/90 to-blue-950/10 sm:via-white/80 lg:via-white/70 lg:to-indigo-950/5" />
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[linear-gradient(to_bottom,rgba(248,251,255,0.42),rgba(246,244,255,0.3)_62%,rgba(255,255,255,0.76))]" />
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_12%_18%,rgba(37,99,235,0.1),transparent_28%),radial-gradient(circle_at_90%_16%,rgba(192,24,245,0.1),transparent_25%)]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-35 [background-image:linear-gradient(rgba(37,99,235,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.08)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
        <svg aria-hidden="true" className="absolute inset-0 -z-10 size-full opacity-40" viewBox="0 0 1440 850" preserveAspectRatio="none"><path d="M-60 610C230 430 385 775 720 520s510-130 790-340" fill="none" stroke="url(#hero-line)" strokeWidth="1.2" /><path d="M-80 680C250 500 420 840 790 590s490-120 760-330" fill="none" stroke="url(#hero-line)" strokeWidth="0.65" /><defs><linearGradient id="hero-line" x1="0" x2="1"><stop stopColor="#2563eb" stopOpacity="0" /><stop offset="0.5" stopColor="#38bdf8" /><stop offset="1" stopColor="#c026f5" stopOpacity="0" /></linearGradient></defs></svg>

        <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-[1320px] items-center gap-9 px-5 py-10 lg:grid-cols-[0.86fr_1.14fr] lg:gap-7 lg:px-7 lg:py-7 xl:gap-10 xl:py-8">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/75 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700 shadow-sm backdrop-blur"><Sparkles className="size-3.5 text-fuchsia-500" />{t.hero.eyebrow}</div>
            <h1 className="mt-4 text-[clamp(3.15rem,5.25vw,5.65rem)] font-semibold leading-[1.03] tracking-[-0.055em] text-[#06102d]">
              {t.hero.headline.map((line, index) => <span key={line} className={cn("block", index === 2 && "text-[#121f52]")}><span className={cn(index === 1 && "brand-text inline-block pb-[0.12em]")}>{line}</span></span>)}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-7">{t.hero.subtitle}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href="#modules" className={cn(buttonVariants({ size: "lg" }), "brand-gradient h-11 px-5 shadow-[0_16px_38px_rgba(37,99,235,0.25)]")}>{t.hero.primaryCta}<ArrowRight className="size-4" /></a>
              <a href="#capabilities" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 border-blue-200 bg-white/70 px-5 text-[#071331] backdrop-blur hover:bg-white")}>{t.hero.secondaryCta}</a>
            </div>
            <div className="mt-7 grid max-w-xl grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
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
