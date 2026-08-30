"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, ChevronDown, LoaderCircle, Menu } from "lucide-react";
import { toast } from "sonner";

import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import type { DashboardVariant } from "@/lib/dashboard/dashboard-config";

type ProfileSwitcherOption = {
  id: string;
  displayName: string;
  label: string;
};

type ProfileSwitcherTranslations = Pick<Dictionary["app"]["profiles"], "selected" | "selecting" | "selectionSuccess" | "selectionFailed">;

type TopbarProps = {
  area: "app" | "admin";
  title: string;
  locale: Locale;
  translations: Dictionary["shell"];
  dashboardTranslations?: Dictionary["app"]["dashboardShell"];
  dashboardVariant?: DashboardVariant;
  languageLabel: string;
  accountName: string;
  profileLabel: string;
  activeProfileId: string;
  activeProfileName: string;
  activeProfileStatus: string;
  profiles: ProfileSwitcherOption[];
  profileSwitcherTranslations: ProfileSwitcherTranslations;
};

export function Topbar({ area, title, locale, translations: t, dashboardTranslations, dashboardVariant, languageLabel, accountName, profileLabel, activeProfileId, activeProfileName, activeProfileStatus, profiles, profileSwitcherTranslations: switcherT }: TopbarProps) {
  const router = useRouter();
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);
  const initials = accountName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "TP";

  async function selectProfile(profileId: string) {
    if (profileId === activeProfileId || pendingProfileId) return;

    setPendingProfileId(profileId);
    const response = await fetch("/api/auth/active-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    }).catch(() => null);
    setPendingProfileId(null);

    if (!response?.ok) {
      toast.error(switcherT.selectionFailed);
      return;
    }

    toast.success(switcherT.selectionSuccess);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="icon" className="lg:hidden" aria-label={t.openNavigation} />}><Menu /></SheetTrigger>
          <SheetContent side="left" className="w-72 p-0" closeLabel={t.close}><SheetHeader className="sr-only"><SheetTitle>{t.navigation}</SheetTitle><SheetDescription>{t.mainMenu}</SheetDescription></SheetHeader>{area === "app" && dashboardTranslations && dashboardVariant ? <AppSidebar locale={locale} translations={t} dashboardTranslations={dashboardTranslations} dashboardVariant={dashboardVariant} activeProfileName={activeProfileName} activeProfileStatus={activeProfileStatus} mobile /> : <AdminSidebar locale={locale} translations={t} mobile />}</SheetContent>
        </Sheet>
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{area === "app" ? t.mySpace : t.administration}</p><h1 className="text-lg font-semibold tracking-tight text-[#06113B]">{title}</h1></div>
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher locale={locale} label={languageLabel} />
        <Button variant="ghost" size="icon" aria-label={t.notifications}><Bell /></Button>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={t.switchProfile} className="flex items-center gap-2 rounded-xl p-1.5 text-left hover:bg-slate-50">
            <Avatar><AvatarFallback className="bg-blue-100 font-semibold text-blue-700">{initials}</AvatarFallback></Avatar>
            <div className="hidden sm:block"><p className="max-w-40 truncate text-sm font-semibold text-[#06113B]">{accountName}</p><p className="max-w-40 truncate text-xs text-slate-500">{profileLabel}</p></div>
            <ChevronDown className="hidden size-4 text-slate-400 sm:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 w-72 overflow-y-auto">
            <DropdownMenuLabel>{t.activeProfile}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {profiles.map((profile) => {
              const selected = profile.id === activeProfileId;
              const pending = profile.id === pendingProfileId;

              return (
                <DropdownMenuItem
                  key={profile.id}
                  aria-current={selected ? "true" : undefined}
                  className={selected ? "bg-blue-50" : undefined}
                  disabled={Boolean(pendingProfileId)}
                  onClick={selected ? undefined : () => void selectProfile(profile.id)}
                >
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="truncate font-medium">{profile.displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">{profile.label}</p>
                  </div>
                  {pending ? <><LoaderCircle className="animate-spin" /><span className="sr-only">{switcherT.selecting}</span></> : selected ? <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700"><Check />{switcherT.selected}</span> : null}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
