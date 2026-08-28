import { ArrowUpRight, BadgeCheck, BookOpen, CalendarClock, CalendarDays, ChartNoAxesCombined, ClipboardCheck, GraduationCap, MessageSquareText, School, UsersRound } from "lucide-react";

import type { Dictionary } from "@/i18n/dictionaries/ro";

const moduleIcons = [UsersRound, BookOpen, GraduationCap, ClipboardCheck, CalendarDays, CalendarClock, MessageSquareText, BadgeCheck, School, ChartNoAxesCombined];
const moduleBadgeStyles = [
  "bg-blue-50 text-blue-700 ring-blue-100",
  "bg-violet-50 text-violet-700 ring-violet-100",
  "bg-emerald-50 text-emerald-700 ring-emerald-100",
  "bg-orange-50 text-orange-700 ring-orange-100",
  "bg-cyan-50 text-cyan-700 ring-cyan-100",
  "bg-pink-50 text-pink-700 ring-pink-100",
  "bg-indigo-50 text-indigo-700 ring-indigo-100",
  "bg-amber-50 text-amber-700 ring-amber-100",
  "bg-teal-50 text-teal-700 ring-teal-100",
  "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
];

export function PlatformModules({ translations: t }: { translations: Dictionary["home"]["modules"] }) {
  return (
    <section id="modules" className="relative scroll-mt-28 overflow-hidden bg-white py-16 sm:py-20">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.07),transparent_65%)]" />
      <div className="relative mx-auto max-w-[1360px] px-5 lg:px-7">
        <div className="mx-auto max-w-3xl text-center"><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">{t.eyebrow}</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[#071331] sm:text-4xl">{t.title}</h2><p className="mt-4 text-base leading-7 text-slate-500 sm:text-lg">{t.description}</p></div>
        <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {t.items.map((item, index) => {
            const Icon = moduleIcons[index];
            return <article key={item.title} className="group relative min-h-[224px] overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white p-5 shadow-[0_12px_36px_rgba(15,36,87,0.055)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_20px_55px_rgba(37,99,235,0.12)]"><div aria-hidden="true" className="absolute -right-10 -top-10 size-28 rounded-full bg-gradient-to-br from-blue-100/65 to-fuchsia-100/35 blur-2xl transition group-hover:scale-125" /><div className="relative flex items-center justify-between"><span className="text-[11px] font-semibold tracking-[0.18em] text-slate-300">{String(index + 1).padStart(2, "0")}</span><div className={`flex size-10 items-center justify-center rounded-xl ring-1 ${moduleBadgeStyles[index]}`}><Icon className="size-[18px]" /></div></div><h3 className="relative mt-5 text-base font-semibold leading-5 text-[#071331]">{item.title}</h3><p className="relative mt-2 text-[13px] leading-5 text-slate-500">{item.description}</p><a href="#capabilities" className="relative mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-blue-700">{t.explore}<ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></a></article>;
          })}
        </div>
      </div>
    </section>
  );
}
