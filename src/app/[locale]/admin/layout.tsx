import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";

export default async function AdminLayout({ children, params }: { children: ReactNode; params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);

  return <div className="min-h-screen bg-slate-50"><aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block"><AdminSidebar locale={locale} translations={dictionary.shell} /></aside><div className="lg:pl-64"><Topbar area="admin" title={dictionary.shell.platformControl} locale={locale} translations={dictionary.shell} languageLabel={dictionary.language.label} /><main className="p-4 sm:p-6 lg:p-8">{children}</main></div></div>;
}
