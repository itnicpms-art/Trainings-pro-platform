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
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <div className={cn("flex size-8 items-center justify-center rounded-xl", tone)}><Icon className="size-3.5" /></div>
            <h3 className="mt-2 text-[13px] font-semibold leading-4 text-[#06113B]">{title}</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{value ?? "0"}</span>
        </div>
        <DashboardEmptyState message={message} comingSoon={comingSoon} />
      </CardContent>
    </Card>
  );
}
