import { Clock3 } from "lucide-react";

export function DashboardEmptyState({ message, comingSoon }: { message: string; comingSoon: string }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-3">
      <p className="text-xs leading-5 text-slate-500">{message}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-500"><Clock3 className="size-3" />{comingSoon}</span>
    </div>
  );
}
