import { Badge } from "@/components/ui/badge";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import { dashboardModuleMeta } from "@/components/dashboard/dashboard-module-meta";
import { dashboardVariants, type DashboardVariant } from "@/lib/dashboard/dashboard-config";

export function DashboardSidebarModules({ variant, translations: t }: { variant: DashboardVariant; translations: Dictionary["app"]["dashboardShell"] }) {
  return (
    <div className="space-y-1">
      {dashboardVariants[variant].sidebar.map((moduleKey) => {
        const Icon = dashboardModuleMeta[moduleKey].icon;
        return (
          <div key={moduleKey} aria-disabled="true" title={`${t.modules[moduleKey].title} · ${t.comingSoon}`} className="flex cursor-not-allowed items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-400">
            <Icon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{t.modules[moduleKey].title}</span>
            <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">{t.comingSoon}</Badge>
          </div>
        );
      })}
    </div>
  );
}
