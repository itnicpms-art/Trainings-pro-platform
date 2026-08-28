import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { locales } from "@/i18n/config";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);

  return {
    title: { default: "Trainings PRO", template: "%s | Trainings PRO" },
    description: dictionary.metadata.description,
  };
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: LocaleParams }) {
  const locale = await resolveLocale(params);

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-950">{children}<Toaster richColors /></body>
    </html>
  );
}
