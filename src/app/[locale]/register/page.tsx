import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  return { title: dictionary.auth.registerMetadata };
}

export default async function RegisterPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);

  return <AuthShell locale={locale} language={dictionary.language} translations={dictionary.auth} title={dictionary.auth.registerTitle} description={dictionary.auth.registerDescription}><AuthForm mode="register" locale={locale} translations={dictionary.auth} /></AuthShell>;
}
