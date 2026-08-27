import type { ReactNode } from "react";
export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">{eyebrow}</p><h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#06113B]">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p></div>{action}</div>;
}
