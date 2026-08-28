import { BellRing, CreditCard, ScanSearch, ShieldCheck } from "lucide-react";

import type { Dictionary } from "@/i18n/dictionaries/ro";

const capabilityIcons = [CreditCard, BellRing, ShieldCheck, ScanSearch];

export function CapabilitiesStrip({ translations: t }: { translations: Dictionary["home"]["capabilities"] }) {
  return (
    <section id="capabilities" className="scroll-mt-28 border-y border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-violet-50/70 py-16">
      <div className="mx-auto max-w-[1480px] px-5 lg:px-8"><h2 className="text-center text-2xl font-semibold tracking-tight text-[#071331] sm:text-3xl">{t.title}</h2><div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{t.items.map((item, index) => { const Icon = capabilityIcons[index]; return <div key={item.title} className="flex items-center gap-4 rounded-2xl border border-white bg-white/75 p-5 shadow-sm backdrop-blur"><div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#071331] text-cyan-300 shadow-[0_8px_25px_rgba(7,19,49,0.18)]"><Icon className="size-5" /></div><div><h3 className="text-sm font-semibold text-[#071331]">{item.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p></div></div>; })}</div></div>
    </section>
  );
}
