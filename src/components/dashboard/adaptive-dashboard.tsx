import { Building2, Layers3, ShieldCheck, UsersRound } from "lucide-react";

import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { dashboardModuleMeta } from "@/components/dashboard/dashboard-module-meta";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { AcademicContextReadout, TrainingContextReadout } from "@/components/dashboard/home-context-readout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import type { UserProfile } from "@/lib/auth/get-user-profiles";
import { dashboardVariants, isDashboardOrganizationModule, type DashboardModuleKey, type DashboardVariant } from "@/lib/dashboard/dashboard-config";
import type { HomeAcademicContext, HomeTrainingContext } from "@/lib/dashboard/get-home-contexts";

type AdaptiveDashboardProps = {
  locale: Locale;
  translations: Dictionary["app"]["dashboardShell"];
  variant: DashboardVariant;
  profile: UserProfile;
  profileLabel: string;
  statusLabel: string;
  activeProfileCount: number;
  organizationCount: number;
  showOrganizationContext: boolean;
  showAcademicContext: boolean;
  showTrainingContext: boolean;
  academicContext: HomeAcademicContext | null;
  trainingContext: HomeTrainingContext | null;
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
  showOrganizationContext,
  showAcademicContext,
  showTrainingContext,
  academicContext,
  trainingContext,
  canAccessPlatformAdmin,
}: AdaptiveDashboardProps) {
  const config = dashboardVariants[variant];
  const variantText = t.variants[variant];
  const visibleModules = showOrganizationContext ? config.modules : config.modules.filter((moduleKey) => !isDashboardOrganizationModule(moduleKey));
  const firstModule = visibleModules[0];
  const summaryModules = visibleModules.slice(0, showOrganizationContext ? 2 : 3);
  const organizationLabel = (() => {
    if (variant === "academicStudent" || variant === "professor") return t.universityContext;
    if (variant === "coordinator") return t.academicContext;
    if (variant === "universityAdmin") return t.managedUniversity;
    if (variant === "platformAdmin") return t.organizations;
    return t.organizationContext;
  })();
  const moduleTitle = (moduleKey: DashboardModuleKey) => {
    if (moduleKey === "university" && variant === "universityAdmin") return t.academicStructure;
    return t.modules[moduleKey].title;
  };
  const contextualValue = (moduleKey: DashboardModuleKey) => {
    if (moduleKey === "organization") return trainingContext?.organization_name ?? profile.organizationName;
    if (moduleKey === "university") return academicContext?.university_name;
    if (moduleKey === "representativeStatus") return statusLabel;
    if (moduleKey === "adminAccess" && canAccessPlatformAdmin) return t.available;
    if (["academicProgram", "academicYear", "semester", "group"].includes(moduleKey)) return t.comingSoon;
    return null;
  };

  const stats = [
    { label: t.activeProfiles, value: String(activeProfileCount), note: t.realAccountData, icon: UsersRound, tone: "bg-blue-100 text-blue-700" },
    ...(showOrganizationContext ? [{ label: organizationLabel, value: String(organizationCount), note: t.realAccountData, icon: Building2, tone: "bg-violet-100 text-violet-700" }] : []),
    ...summaryModules.map((moduleKey) => ({ label: moduleTitle(moduleKey), value: "0", note: t.comingSoon, icon: dashboardModuleMeta[moduleKey].icon, tone: dashboardModuleMeta[moduleKey].tone })),
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
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
        organizationLabel={organizationLabel}
        accent={config.accent}
      />

      {showAcademicContext ? <AcademicContextReadout context={academicContext} translations={t.homeContext} placeholder={t.comingSoon} /> : null}
      {showTrainingContext ? <TrainingContextReadout context={trainingContext} translations={t.homeContext} placeholder={t.comingSoon} /> : null}

      <section aria-label={t.summaryLabel} className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => <DashboardStatCard key={stat.label} {...stat} />)}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_270px]">
        <section>
          <div className="mb-2.5 flex items-end justify-between gap-3">
            <div><h2 className="text-base font-semibold text-[#06113B]">{t.modulesTitle}</h2><p className="mt-0.5 text-xs text-slate-500">{t.modulesDescription}</p></div>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-500 sm:block">{t.shellOnly}</span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleModules.map((moduleKey) => {
              const meta = dashboardModuleMeta[moduleKey];
              const copy = t.modules[moduleKey];
              return <DashboardSectionCard key={moduleKey} moduleKey={moduleKey} title={moduleTitle(moduleKey)} message={copy.empty} comingSoon={t.comingSoon} value={contextualValue(moduleKey)} icon={meta.icon} tone={meta.tone} />;
            })}
          </div>
        </section>

        <aside className="space-y-3">
          <DashboardQuickActions locale={locale} translations={t.quickActions} futureLabel={t.modules[firstModule].title} comingSoon={t.comingSoon} canAccessAdmin={canAccessPlatformAdmin} />
          <Card size="sm" className="rounded-2xl bg-[#06113B] text-white shadow-lg shadow-blue-950/10 ring-0">
            <CardHeader>
              <div className="flex size-9 items-center justify-center rounded-xl bg-white/10"><ShieldCheck className="size-4 text-cyan-300" /></div>
              <CardTitle className="mt-1 text-white">{t.protected.title}</CardTitle>
              <CardDescription className="text-blue-100/70">{t.protected.description}</CardDescription>
            </CardHeader>
            <CardContent><div className="flex gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5"><Layers3 className="mt-0.5 size-4 shrink-0 text-violet-300" /><p className="text-[11px] leading-4 text-blue-50/80">{t.protected.detail}</p></div></CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
