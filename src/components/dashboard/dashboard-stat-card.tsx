import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DashboardStatCard({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <Card className="gap-0 rounded-2xl bg-white py-0 shadow-sm ring-slate-200/80">
      <CardContent className="flex min-h-28 items-center gap-4 p-4">
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", tone)}><Icon className="size-5" /></div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-[#06113B]">{value}</p>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">{note}</p>
        </div>
      </CardContent>
    </Card>
  );
}
