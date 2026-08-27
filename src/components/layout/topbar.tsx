"use client";

import { Bell, ChevronDown, Menu } from "lucide-react";

import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type TopbarProps = { area: "app" | "admin"; title: string };

export function Topbar({ area, title }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="icon" className="lg:hidden" aria-label="Deschide navigarea" />}><Menu /></SheetTrigger>
          <SheetContent side="left" className="w-72 p-0"><SheetHeader className="sr-only"><SheetTitle>Navigare</SheetTitle><SheetDescription>Meniul principal</SheetDescription></SheetHeader>{area === "app" ? <AppSidebar mobile /> : <AdminSidebar mobile />}</SheetContent>
        </Sheet>
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{area === "app" ? "Spațiul meu" : "Administrare"}</p><h1 className="text-lg font-semibold tracking-tight text-[#06113B]">{title}</h1></div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notificări" className="relative"><Bell /><span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-fuchsia-500 ring-2 ring-white" /></Button>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl p-1.5 text-left hover:bg-slate-50">
            <Avatar><AvatarFallback className="bg-blue-100 font-semibold text-blue-700">TP</AvatarFallback></Avatar>
            <div className="hidden sm:block"><p className="text-sm font-semibold text-[#06113B]">Trainings PRO</p><p className="text-xs text-slate-500">{area === "admin" ? "Platform Admin" : "Individual Member"}</p></div>
            <ChevronDown className="hidden size-4 text-slate-400 sm:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52"><DropdownMenuLabel>Contul meu</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem>Schimbă profilul</DropdownMenuItem><DropdownMenuItem>Preferințe</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem>Deconectare</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
