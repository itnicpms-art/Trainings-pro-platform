"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, UsersRound } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { DashboardSidebarModules } from "@/components/dashboard/dashboard-sidebar-modules";
import { LogoutButton } from "@/components/auth/logout-button";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import type { DashboardVariant } from "@/lib/dashboard/dashboard-config";
import { cn } from "@/lib/utils";

export function AppSidebar({ locale, translations: t, dashboardTranslations, dashboardVariant, activeProfileName, activeProfileStatus, mobile = false }: { locale: Locale; translations: Dictionary["shell"]; dashboardTranslations: Dictionary["app"]["dashboardShell"]; dashboardVariant: DashboardVariant; activeProfileName: string; activeProfileStatus: string; mobile?: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: `/${locale}/app`, label: t.dashboard, icon: LayoutDashboard },
    { href: `/${locale}/app/profiles`, label: t.profiles, icon: UsersRound },
    { href: `/${locale}/app/settings`, label: t.settings, icon: Settings },
  ];
  return (
    <div className={cn("flex h-full flex-col bg-white", !mobile && "border-r border-slate-200")}>
      <div className="flex h-20 items-center px-5"><BrandLogo compact /></div>
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4" aria-label={t.memberNavigation}>
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t.personalSpace}</p>
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-[#06113B]")}><Icon className="size-4" />{label}</Link>;
        })}
        <div className="my-3 border-t border-slate-100" />
        <DashboardSidebarModules variant={dashboardVariant} translations={dashboardTranslations} />
      </nav>
      <div className="m-3 rounded-2xl bg-slate-50 p-3"><p className="text-xs font-semibold text-[#06113B]">{t.activeProfile}</p><p className="mt-1 truncate text-xs text-slate-500">{activeProfileName}</p><span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">{activeProfileStatus}</span><div className="mt-3 [&>button]:w-full"><LogoutButton locale={locale} label={t.logout} /></div></div>
    </div>
  );
}
