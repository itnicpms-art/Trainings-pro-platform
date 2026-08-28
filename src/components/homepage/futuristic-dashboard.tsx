import { Award, BarChart3, BookOpen, CalendarDays, LayoutDashboard, Play, Sparkles, Trophy } from "lucide-react";

import type { Dictionary } from "@/i18n/dictionaries/ro";

export function FuturisticDashboard({ translations: t }: { translations: Dictionary["home"]["dashboard"] }) {
  return (
    <div className="relative mx-auto w-full max-w-[620px] lg:ml-auto xl:max-w-[660px] 2xl:max-w-[700px]">
      <div aria-hidden="true" className="absolute -inset-12 rounded-[4rem] bg-[radial-gradient(circle_at_50%_50%,rgba(66,133,255,0.24),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(203,54,255,0.18),transparent_35%)] blur-2xl" />
      <div aria-hidden="true" className="absolute -left-8 top-1/3 h-px w-28 rotate-12 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_16px_#22d3ee]" />
      <div aria-hidden="true" className="absolute -right-3 top-14 size-2 rounded-full bg-fuchsia-400 shadow-[0_0_22px_6px_rgba(232,121,249,0.45)]" />

      <div className="relative rotate-[0.5deg] rounded-[2rem] border border-white/80 bg-white/55 p-2 shadow-[0_35px_110px_rgba(21,47,118,0.24)] backdrop-blur-2xl sm:p-3">
        <div className="flex min-h-[470px] overflow-hidden rounded-[1.55rem] border border-slate-900/10 bg-[#081334] text-white sm:min-h-[500px] xl:min-h-[525px] 2xl:min-h-[560px]">
          <aside className="flex w-14 shrink-0 flex-col items-center gap-5 border-r border-white/10 bg-[#050d27]/90 py-5 sm:w-16">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-fuchsia-500 shadow-[0_0_22px_rgba(59,130,246,0.55)]"><Sparkles className="size-4" /></div>
            {[LayoutDashboard, BookOpen, CalendarDays, Trophy].map((Icon, index) => <div key={index} className={index === 0 ? "flex size-9 items-center justify-center rounded-xl bg-blue-500/20 text-cyan-300 ring-1 ring-blue-400/30" : "flex size-9 items-center justify-center text-blue-200/45"}><Icon className="size-4" /></div>)}
            <div className="mt-auto size-7 rounded-full border border-cyan-300/30 bg-gradient-to-br from-blue-400/50 to-fuchsia-500/40 shadow-[0_0_18px_rgba(34,211,238,0.3)]" />
          </aside>

          <div className="min-w-0 flex-1 bg-[radial-gradient(circle_at_90%_10%,rgba(48,92,255,0.18),transparent_30%),linear-gradient(145deg,#0b1738,#07102b)] p-3 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300/75">{t.previewLabel}</p><h2 className="mt-2 text-lg font-semibold sm:text-2xl">{t.welcome}</h2><p className="mt-1 max-w-sm text-[10px] leading-4 text-blue-100/55 sm:text-xs">{t.description}</p></div>
              <div className="hidden rounded-xl border border-white/10 bg-white/5 p-2 text-cyan-300 sm:block"><BarChart3 className="size-4" /></div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1.45fr_0.8fr]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.065] p-3 shadow-inner shadow-blue-400/5 backdrop-blur-xl">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/55">{t.coursesLabel}</p>
                <div className="space-y-2">
                  {t.courses.map((course, index) => (
                    <div key={course} className="group flex items-center gap-3 rounded-xl border border-white/8 bg-gradient-to-r from-white/[0.07] to-transparent p-2.5">
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${index === 0 ? "bg-blue-500/20 text-cyan-300" : index === 1 ? "bg-fuchsia-500/20 text-fuchsia-300" : "bg-violet-500/20 text-violet-300"}`}><Play className="size-3.5" /></div>
                      <div className="min-w-0"><p className="truncate text-xs font-semibold text-white/90">{course}</p><p className="mt-0.5 truncate text-[9px] text-blue-100/45">{t.syncStatus}</p></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-fuchsia-300/15 bg-gradient-to-br from-fuchsia-500/12 to-blue-500/8 p-3">
                <CalendarDays className="size-4 text-fuchsia-300" /><p className="mt-4 text-xs font-semibold">{t.nextEvent}</p><p className="mt-1 text-[9px] leading-4 text-blue-100/50">{t.eventPlaceholder}</p><div className="mt-4 h-px bg-gradient-to-r from-fuchsia-400/50 to-transparent" />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[{ icon: BarChart3, label: t.realProgress }, { icon: Trophy, label: t.achievements }, { icon: CalendarDays, label: t.calendar }].map(({ icon: Icon, label }, index) => (
                <div key={label} className={`rounded-2xl border border-white/10 bg-white/[0.055] p-3 ${index === 2 ? "col-span-2 sm:col-span-1" : ""}`}><Icon className="size-4 text-cyan-300" /><p className="mt-5 text-[10px] font-medium leading-4 text-blue-50/80">{label}</p><div className="mt-3 flex gap-1"><span className="h-1 flex-1 rounded-full bg-blue-400/40" /><span className="h-1 flex-1 rounded-full bg-fuchsia-400/30" /><span className="h-1 flex-1 rounded-full bg-cyan-400/20" /></div></div>
              ))}
            </div>

            <div className="mt-3 hidden items-end gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 pb-3 pt-4 sm:flex" aria-label={t.analytics}>
              {[28, 42, 34, 58, 47, 70, 62, 82, 76, 94].map((height, index) => <span key={index} className="flex-1 rounded-t bg-gradient-to-t from-blue-600/25 via-blue-400/55 to-cyan-300/80" style={{ height: `${height / 2}px` }} />)}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-7 -left-3 hidden items-center gap-3 rounded-2xl border border-cyan-300/25 bg-[#071331]/90 px-4 py-3 text-white shadow-[0_15px_45px_rgba(8,47,107,0.35),0_0_28px_rgba(34,211,238,0.14)] backdrop-blur-xl sm:flex"><div className="flex size-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300"><Award className="size-5" /></div><div><p className="text-[9px] uppercase tracking-[0.16em] text-cyan-200/50">{t.academy}</p><p className="text-xs font-semibold">{t.certificate}</p></div></div>
      <div aria-hidden="true" className="absolute -bottom-8 left-1/2 h-5 w-4/5 -translate-x-1/2 rounded-[50%] bg-blue-500/25 blur-xl" />
    </div>
  );
}
