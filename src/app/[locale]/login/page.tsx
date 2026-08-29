import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  return { title: dictionary.auth.loginMetadata };
}

export default async function LoginPage({ params, searchParams }: { params: LocaleParams; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  const query = await searchParams;
  const nextPath = typeof query.next === "string" ? query.next : undefined;
  const callbackError = typeof query.authError === "string";

  return <AuthShell locale={locale} language={dictionary.language} translations={dictionary.auth} title={dictionary.auth.loginTitle} description={dictionary.auth.loginDescription}><AuthForm locale={locale} translations={dictionary.auth} nextPath={nextPath} callbackError={callbackError} /></AuthShell>;
}
