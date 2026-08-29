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
      <CardContent className="flex min-h-23 items-center gap-3 p-3">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", tone)}><Icon className="size-4" /></div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-0.5 text-xl font-semibold tracking-tight text-[#06113B]">{value}</p>
          <p className="truncate text-[10px] text-slate-400">{note}</p>
        </div>
      </CardContent>
    </Card>
  );
}
