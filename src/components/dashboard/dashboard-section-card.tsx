import type { LucideIcon } from "lucide-react";

import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DashboardSectionCard({
  moduleKey,
  title,
  message,
  comingSoon,
  value,
  icon: Icon,
  tone,
}: {
  moduleKey: string;
  title: string;
  message: string;
  comingSoon: string;
  value?: string | null;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <Card data-dashboard-module={moduleKey} className="gap-0 rounded-2xl bg-white py-0 shadow-sm ring-slate-200/80 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={cn("flex size-9 items-center justify-center rounded-xl", tone)}><Icon className="size-4" /></div>
            <h3 className="mt-3 text-sm font-semibold leading-5 text-[#06113B]">{title}</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{value ?? "0"}</span>
        </div>
        <DashboardEmptyState message={message} comingSoon={comingSoon} />
      </CardContent>
    </Card>
  );
}
