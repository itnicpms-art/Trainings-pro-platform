import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  return { title: dictionary.auth.registerMetadata };
}

export default async function RegisterPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);

  return <AuthShell wide locale={locale} language={dictionary.language} translations={dictionary.auth} title={dictionary.auth.registerTitle} description={dictionary.auth.registerDescription}><RegisterForm locale={locale} translations={dictionary.auth} /></AuthShell>;
}
