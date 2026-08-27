"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, UsersRound } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/profiles", label: "Profilele mele", icon: UsersRound },
  { href: "/app/settings", label: "Setări", icon: Settings },
];

export function AppSidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <div className={cn("flex h-full flex-col bg-white", !mobile && "border-r border-slate-200")}>
      <div className="flex h-20 items-center px-5"><BrandLogo compact /></div>
      <nav className="flex-1 space-y-1.5 px-3 py-5" aria-label="Navigare membru">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Spațiu personal</p>
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-[#06113B]")}><Icon className="size-4" />{label}</Link>;
        })}
      </nav>
      <div className="m-4 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-semibold text-[#06113B]">Profil activ</p><p className="mt-1 text-xs text-slate-500">Individual Member</p><span className="mt-3 inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">Activ</span></div>
    </div>
  );
}
