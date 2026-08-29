"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import { isSafeNextPath } from "@/lib/auth/is-safe-next-path";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthFormProps = {
  locale: Locale;
  translations: Dictionary["auth"];
  nextPath?: string;
  callbackError?: boolean;
};

function getLoginError(code: string | undefined, t: Dictionary["auth"]) {
  if (code === "email_not_confirmed") return t.errors.emailNotConfirmed;
  if (code === "over_request_rate_limit") return t.errors.rateLimit;
  return t.errors.invalidCredentials;
}

export function AuthForm({ locale, translations: t, nextPath, callbackError = false }: AuthFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const supabase = createBrowserSupabaseClient();
    if (!supabase) { toast.error(t.missingConfiguration); return; }
    setPending(true);
    const result = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (result.error) { toast.error(getLoginError(result.error.code, t)); return; }
    toast.success(t.loginSuccess);
    router.replace(isSafeNextPath(nextPath, locale) ? nextPath : `/${locale}/app`);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {callbackError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{t.errors.callback}</p>}
      <div className="space-y-2"><Label htmlFor="email">{t.email}</Label><Input id="email" name="email" type="email" placeholder={t.emailPlaceholder} autoComplete="email" required /></div>
      <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password">{t.password}</Label><span className="text-xs text-slate-400">{t.passwordHint}</span></div><Input id="password" name="password" type="password" minLength={8} autoComplete="current-password" required /></div>
      <Button type="submit" size="lg" className="brand-gradient h-11 w-full" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" /> {t.loading}</> : <>{t.login}<ArrowRight /></>}</Button>
      <p className="text-center text-sm text-slate-500">{t.noAccount} <Link className="font-semibold text-blue-700 hover:underline" href={`/${locale}/register`}>{t.registerLink}</Link></p>
    </form>
  );
}
