import { BellRing, CreditCard, ScanSearch, ShieldCheck } from "lucide-react";

import type { Dictionary } from "@/i18n/dictionaries/ro";

const capabilityIcons = [CreditCard, BellRing, ShieldCheck, ScanSearch];

export function CapabilitiesStrip({ translations: t }: { translations: Dictionary["home"]["capabilities"] }) {
  return (
    <section id="capabilities" className="scroll-mt-28 border-y border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-violet-50/70 py-12 sm:py-14">
      <div className="mx-auto max-w-[1360px] px-5 lg:px-7"><h2 className="text-center text-2xl font-semibold tracking-tight text-[#071331] sm:text-3xl">{t.title}</h2><div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{t.items.map((item, index) => { const Icon = capabilityIcons[index]; return <div key={item.title} className="flex items-center gap-3 rounded-2xl border border-white bg-white/75 p-4 shadow-sm backdrop-blur"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#071331] text-cyan-300 shadow-[0_8px_25px_rgba(7,19,49,0.18)]"><Icon className="size-[18px]" /></div><div><h3 className="text-sm font-semibold text-[#071331]">{item.title}</h3><p className="mt-0.5 text-xs leading-5 text-slate-500">{item.description}</p></div></div>; })}</div></div>
    </section>
  );
}
