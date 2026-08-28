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
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "register";
  locale: Locale;
  translations: Dictionary["auth"];
};

export function AuthForm({ mode, locale, translations: t }: AuthFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("fullName") ?? "");
    const supabase = createBrowserSupabaseClient();
    if (!supabase) { toast.error(t.missingConfiguration); return; }
    setPending(true);
    const result = mode === "register"
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/${locale}/app` } })
      : await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (result.error) { toast.error(result.error.message); return; }
    toast.success(mode === "register" ? t.registrationSuccess : t.loginSuccess);
    router.push(`/${locale}/app`);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {mode === "register" && <div className="space-y-2"><Label htmlFor="fullName">{t.fullName}</Label><Input id="fullName" name="fullName" placeholder={t.fullNamePlaceholder} autoComplete="name" required /></div>}
      <div className="space-y-2"><Label htmlFor="email">{t.email}</Label><Input id="email" name="email" type="email" placeholder={t.emailPlaceholder} autoComplete="email" required /></div>
      <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password">{t.password}</Label><span className="text-xs text-slate-400">{t.passwordHint}</span></div><Input id="password" name="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></div>
      <Button type="submit" size="lg" className="brand-gradient h-11 w-full" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : mode === "register" ? t.register : t.login}{!pending && <ArrowRight />}</Button>
      <p className="text-center text-sm text-slate-500">{mode === "register" ? t.hasAccount : t.noAccount} <Link className="font-semibold text-blue-700 hover:underline" href={`/${locale}/${mode === "register" ? "login" : "register"}`}>{mode === "register" ? t.loginLink : t.registerLink}</Link></p>
    </form>
  );
}
