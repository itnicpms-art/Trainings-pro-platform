"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LoaderCircle, Menu } from "lucide-react";

import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";

type TopbarProps = { area: "app" | "admin"; title: string; locale: Locale; translations: Dictionary["shell"]; languageLabel: string; accountName: string; profileLabel: string; activeProfileName: string; activeProfileStatus: string };

export function Topbar({ area, title, locale, translations: t, languageLabel, accountName, profileLabel, activeProfileName, activeProfileStatus }: TopbarProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const initials = accountName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "TP";

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace(`/${locale}/login`);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="icon" className="lg:hidden" aria-label={t.openNavigation} />}><Menu /></SheetTrigger>
          <SheetContent side="left" className="w-72 p-0" closeLabel={t.close}><SheetHeader className="sr-only"><SheetTitle>{t.navigation}</SheetTitle><SheetDescription>{t.mainMenu}</SheetDescription></SheetHeader>{area === "app" ? <AppSidebar locale={locale} translations={t} activeProfileName={activeProfileName} activeProfileStatus={activeProfileStatus} mobile /> : <AdminSidebar locale={locale} translations={t} mobile />}</SheetContent>
        </Sheet>
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{area === "app" ? t.mySpace : t.administration}</p><h1 className="text-lg font-semibold tracking-tight text-[#06113B]">{title}</h1></div>
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher locale={locale} label={languageLabel} />
        <Button variant="ghost" size="icon" aria-label={t.notifications} className="relative"><Bell /><span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-fuchsia-500 ring-2 ring-white" /></Button>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl p-1.5 text-left hover:bg-slate-50">
            <Avatar><AvatarFallback className="bg-blue-100 font-semibold text-blue-700">{initials}</AvatarFallback></Avatar>
            <div className="hidden sm:block"><p className="max-w-40 truncate text-sm font-semibold text-[#06113B]">{accountName}</p><p className="max-w-40 truncate text-xs text-slate-500">{profileLabel}</p></div>
            <ChevronDown className="hidden size-4 text-slate-400 sm:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52"><DropdownMenuLabel>{t.myAccount}</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={() => router.push(`/${locale}/app/profiles`)}>{t.switchProfile}</DropdownMenuItem><DropdownMenuItem onClick={() => router.push(`/${locale}/app/settings`)}>{t.preferences}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={handleLogout} disabled={loggingOut}>{loggingOut && <LoaderCircle className="animate-spin" />}{t.logout}</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
