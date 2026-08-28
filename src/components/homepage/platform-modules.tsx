import { ArrowUpRight, Award, BookOpen, Building2, CalendarDays, ChartNoAxesCombined, ClipboardCheck, GraduationCap, MessagesSquare, TicketCheck, UsersRound } from "lucide-react";

import type { Dictionary } from "@/i18n/dictionaries/ro";

const moduleIcons = [UsersRound, BookOpen, GraduationCap, ClipboardCheck, CalendarDays, TicketCheck, MessagesSquare, Award, Building2, ChartNoAxesCombined];

export function PlatformModules({ translations: t }: { translations: Dictionary["home"]["modules"] }) {
  return (
    <section id="modules" className="relative scroll-mt-28 overflow-hidden bg-white py-24 sm:py-32">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.07),transparent_65%)]" />
      <div className="relative mx-auto max-w-[1480px] px-5 lg:px-8">
        <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">{t.eyebrow}</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-[#071331] sm:text-5xl">{t.title}</h2><p className="mt-5 text-base leading-7 text-slate-500 sm:text-lg">{t.description}</p></div>
        <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {t.items.map((item, index) => {
            const Icon = moduleIcons[index];
            return <article key={item.title} className="group relative min-h-64 overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white p-6 shadow-[0_14px_50px_rgba(15,36,87,0.06)] transition duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-[0_24px_70px_rgba(37,99,235,0.13)]"><div aria-hidden="true" className="absolute -right-12 -top-12 size-32 rounded-full bg-gradient-to-br from-blue-100/80 to-fuchsia-100/50 blur-2xl transition group-hover:scale-125" /><div className="relative flex items-center justify-between"><span className="text-xs font-semibold tracking-[0.18em] text-slate-300">{String(index + 1).padStart(2, "0")}</span><div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-violet-100 text-blue-700 ring-1 ring-blue-100"><Icon className="size-5" /></div></div><h3 className="relative mt-8 text-lg font-semibold text-[#071331]">{item.title}</h3><p className="relative mt-3 text-sm leading-6 text-slate-500">{item.description}</p><a href="#capabilities" className="relative mt-7 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">{t.explore}<ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></a></article>;
          })}
        </div>
      </div>
    </section>
  );
}
