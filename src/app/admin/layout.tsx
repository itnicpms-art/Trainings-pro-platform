import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-slate-50"><aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block"><AdminSidebar /></aside><div className="lg:pl-64"><Topbar area="admin" title="Controlul platformei" /><main className="p-4 sm:p-6 lg:p-8">{children}</main></div></div>;
}
