import { Building2, Layers3, ShieldCheck, UsersRound } from "lucide-react";

import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { dashboardModuleMeta } from "@/components/dashboard/dashboard-module-meta";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import type { UserProfile } from "@/lib/auth/get-user-profiles";
import { dashboardVariants, type DashboardModuleKey, type DashboardVariant } from "@/lib/dashboard/dashboard-config";

type AdaptiveDashboardProps = {
  locale: Locale;
  translations: Dictionary["app"]["dashboardShell"];
  variant: DashboardVariant;
  profile: UserProfile;
  profileLabel: string;
  statusLabel: string;
  activeProfileCount: number;
  organizationCount: number;
  hasAcademicContext: boolean;
  canAccessPlatformAdmin: boolean;
};

export function AdaptiveDashboard({
  locale,
  translations: t,
  variant,
  profile,
  profileLabel,
  statusLabel,
  activeProfileCount,
  organizationCount,
  hasAcademicContext,
  canAccessPlatformAdmin,
}: AdaptiveDashboardProps) {
  const config = dashboardVariants[variant];
  const variantText = t.variants[variant];
  const firstModule = config.modules[0];
  const secondModule = config.modules[1];
  const contextualValue = (moduleKey: DashboardModuleKey) => {
    if ((moduleKey === "organization" || moduleKey === "university") && profile.organizationName) return profile.organizationName;
    if (moduleKey === "representativeStatus") return statusLabel;
    if (moduleKey === "adminAccess" && canAccessPlatformAdmin) return t.available;
    if (["academicProgram", "academicYear", "semester", "group"].includes(moduleKey) && !hasAcademicContext) return t.comingSoon;
    return null;
  };

  const stats = [
    { label: t.activeProfiles, value: String(activeProfileCount), note: t.realAccountData, icon: UsersRound, tone: "bg-blue-100 text-blue-700" },
    { label: t.organizations, value: String(organizationCount), note: t.realAccountData, icon: Building2, tone: "bg-violet-100 text-violet-700" },
    { label: t.modules[firstModule].title, value: "0", note: t.comingSoon, icon: dashboardModuleMeta[firstModule].icon, tone: dashboardModuleMeta[firstModule].tone },
    { label: t.modules[secondModule].title, value: "0", note: t.comingSoon, icon: dashboardModuleMeta[secondModule].icon, tone: dashboardModuleMeta[secondModule].tone },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <DashboardHero
        eyebrow={variantText.eyebrow}
        title={variantText.title}
        subtitle={variantText.subtitle}
        profileName={profile.display_name}
        profileLabel={profileLabel}
        statusLabel={statusLabel}
        shellLabel={t.shellOnly}
        guardrailLabel={t.guardrailLabel}
        guardrail={variantText.guardrail}
        organizationName={profile.organizationName}
        organizationLabel={t.organizationContext}
        accent={config.accent}
      />

      <section aria-label={t.summaryLabel} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <DashboardStatCard key={stat.label} {...stat} />)}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div><h2 className="text-lg font-semibold text-[#06113B]">{t.modulesTitle}</h2><p className="mt-1 text-sm text-slate-500">{t.modulesDescription}</p></div>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-indigo-500 sm:block">{t.shellOnly}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {config.modules.map((moduleKey) => {
              const meta = dashboardModuleMeta[moduleKey];
              const copy = t.modules[moduleKey];
              return <DashboardSectionCard key={moduleKey} moduleKey={moduleKey} title={copy.title} message={copy.empty} comingSoon={t.comingSoon} value={contextualValue(moduleKey)} icon={meta.icon} tone={meta.tone} />;
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <DashboardQuickActions locale={locale} translations={t.quickActions} futureLabel={t.modules[firstModule].title} comingSoon={t.comingSoon} canAccessAdmin={canAccessPlatformAdmin} />
          <Card className="rounded-2xl bg-[#06113B] text-white shadow-lg shadow-blue-950/10 ring-0">
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-2xl bg-white/10"><ShieldCheck className="size-5 text-cyan-300" /></div>
              <CardTitle className="mt-2 text-white">{t.protected.title}</CardTitle>
              <CardDescription className="text-blue-100/70">{t.protected.description}</CardDescription>
            </CardHeader>
            <CardContent><div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3"><Layers3 className="mt-0.5 size-4 shrink-0 text-violet-300" /><p className="text-xs leading-5 text-blue-50/80">{t.protected.detail}</p></div></CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
