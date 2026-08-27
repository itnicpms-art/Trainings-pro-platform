import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-slate-50"><aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block"><AppSidebar /></aside><div className="lg:pl-64"><Topbar area="app" title="Trainings PRO" /><main className="p-4 sm:p-6 lg:p-8">{children}</main></div></div>;
}
