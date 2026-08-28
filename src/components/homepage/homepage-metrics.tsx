import { BookOpenCheck, Building2, Sparkles, UsersRound } from "lucide-react";

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import { getHomepageMetrics } from "@/lib/homepage-metrics";

const metricIcons = [UsersRound, BookOpenCheck, Building2, Sparkles];

export async function HomepageMetrics({ locale, translations: t }: { locale: Locale; translations: Dictionary["home"]["metrics"] }) {
  const metrics = await getHomepageMetrics();
  const values = [metrics.activeLearners, metrics.availableCourses, metrics.partnerUniversities, metrics.learnerSatisfaction];
  const numberFormatter = new Intl.NumberFormat(locale);

  return (
    <section id="metrics" className="relative scroll-mt-28 overflow-hidden bg-[#06102d] py-20 text-white sm:py-24">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgba(37,99,235,0.3),transparent_30%),radial-gradient(circle_at_85%_30%,rgba(192,24,245,0.22),transparent_28%),linear-gradient(120deg,transparent_30%,rgba(34,211,238,0.04)_50%,transparent_70%)]" />
      <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent" />
      <div className="relative mx-auto max-w-[1480px] px-5 lg:px-8">
        <div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">{t.eyebrow}</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">{t.title}</h2></div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
          {t.labels.map((label, index) => { const Icon = metricIcons[index]; const value = values[index]; return <div key={label} className="bg-[#0a1637]/90 p-6 backdrop-blur-xl sm:p-8"><div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/5 text-cyan-300"><Icon className="size-5" /></div><p className="mt-8 text-sm text-blue-100/55">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value === null ? t.placeholder : `${numberFormatter.format(value)}${index === 3 ? "%" : ""}`}</p></div>; })}
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-6 text-blue-100/55">{t.note}</p>
      </div>
    </section>
  );
}
