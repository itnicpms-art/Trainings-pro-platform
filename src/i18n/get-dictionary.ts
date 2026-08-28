import "server-only";

import { notFound } from "next/navigation";

import { isLocale, type Locale } from "@/i18n/config";

const dictionaries = {
  ro: () => import("@/i18n/dictionaries/ro").then((module) => module.default),
  en: () => import("@/i18n/dictionaries/en").then((module) => module.default),
};

export type LocaleParams = Promise<{ locale: string }>;

export async function resolveLocale(params: LocaleParams): Promise<Locale> {
  const { locale } = await params;

  if (!isLocale(locale)) notFound();

  return locale;
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale]();
}
