"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import { cn } from "@/lib/utils";

export function AdminSidebar({ locale, translations: t, mobile = false }: { locale: Locale; translations: Dictionary["shell"]; mobile?: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: `/${locale}/admin`, label: t.dashboard, icon: LayoutDashboard },
    { href: `/${locale}/admin/settings`, label: t.settings, icon: Settings },
  ];
  return (
    <div className={cn("flex h-full flex-col bg-[#06113B] text-white", !mobile && "border-r border-white/5")}>
      <div className="flex h-20 items-center px-5"><BrandLogo compact inverted /></div>
      <nav className="flex-1 space-y-1.5 px-3 py-5" aria-label={t.adminNavigation}>
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200/50">{t.administration}</p>
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-950/30" : "text-blue-100/70 hover:bg-white/5 hover:text-white")}><Icon className="size-4" />{label}</Link>;
        })}
      </nav>
      <div className="m-4 rounded-2xl border border-white/10 bg-white/5 p-4"><ShieldCheck className="size-5 text-cyan-300" /><p className="mt-3 text-sm font-semibold">{t.platformControl}</p><p className="mt-1 text-xs leading-5 text-blue-100/55">{t.platformControlDescription}</p></div>
    </div>
  );
}
