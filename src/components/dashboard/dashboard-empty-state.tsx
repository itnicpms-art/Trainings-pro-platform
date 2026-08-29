import { Clock3 } from "lucide-react";

export function DashboardEmptyState({ message, comingSoon }: { message: string; comingSoon: string }) {
  return (
    <div className="mt-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-2.5">
      <p className="text-[11px] leading-4 text-slate-500">{message}</p>
      <span className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-indigo-500"><Clock3 className="size-3" />{comingSoon}</span>
    </div>
  );
}
