"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2, KeyRound, LoaderCircle, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import { termsVersion } from "@/lib/auth/constants";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { OnboardingFlow } from "@/types/app";

type RegistrationResult = "email_confirmation" | "invitation_pending" | "representative_submitted" | null;

const flowIcons = {
  individual: UserRound,
  invitation: KeyRound,
  representative: Building2,
} satisfies Record<OnboardingFlow, typeof UserRound>;

function getRegistrationError(code: string | undefined, t: Dictionary["auth"]) {
  if (code === "user_already_exists" || code === "email_exists") return t.errors.emailInUse;
  if (code === "weak_password") return t.errors.weakPassword;
  if (code === "over_request_rate_limit") return t.errors.rateLimit;
  return t.errors.registrationFailed;
}

export function RegisterForm({ locale, translations: t }: { locale: Locale; translations: Dictionary["auth"] }) {
  const router = useRouter();
  const [flow, setFlow] = useState<OnboardingFlow>("individual");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<RegistrationResult>(null);

  const options = [
    { id: "individual" as const, title: t.onboarding.individual.title, description: t.onboarding.individual.description },
    { id: "invitation" as const, title: t.onboarding.invitation.title, description: t.onboarding.invitation.description },
    { id: "representative" as const, title: t.onboarding.representative.title, description: t.onboarding.representative.description },
  ];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (password !== confirmPassword) { toast.error(t.errors.passwordMismatch); return; }
    if (form.get("acceptTerms") !== "on") { toast.error(t.errors.termsRequired); return; }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) { toast.error(t.missingConfiguration); return; }

    const callbackUrl = new URL(`/${locale}/auth/callback`, window.location.origin);
    callbackUrl.searchParams.set("next", `/${locale}/app`);

    const metadata: Record<string, string | boolean> = {
      onboarding_flow: flow,
      first_name: String(form.get("firstName") ?? "").trim(),
      last_name: String(form.get("lastName") ?? "").trim(),
      preferred_locale: String(form.get("preferredLanguage") ?? locale),
      terms_accepted: true,
      terms_version: termsVersion,
    };

    if (flow === "invitation") metadata.invitation_code = String(form.get("invitationCode") ?? "").trim();
    if (flow === "representative") {
      metadata.organization_name = String(form.get("organizationName") ?? "").trim();
      metadata.organization_type = String(form.get("organizationType") ?? "other");
      metadata.website = String(form.get("website") ?? "").trim();
      metadata.request_reason = String(form.get("requestReason") ?? "").trim();
    }

    setPending(true);
    const { data, error } = await supabase.auth.signUp({
      email: String(form.get("email") ?? "").trim(),
      password,
      options: { data: metadata, emailRedirectTo: callbackUrl.toString() },
    });
    setPending(false);

    if (error) { toast.error(getRegistrationError(error.code, t)); return; }

    if (flow === "individual" && data.session) {
      toast.success(t.registrationSuccess);
      router.replace(`/${locale}/app`);
      router.refresh();
      return;
    }

    setResult(flow === "representative" ? "representative_submitted" : flow === "invitation" ? "invitation_pending" : "email_confirmation");
  }

  if (result) {
    const content = result === "representative_submitted"
      ? t.registrationStates.representative
      : result === "invitation_pending"
        ? t.registrationStates.invitation
        : t.registrationStates.email;

    return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center"><CheckCircle2 className="mx-auto size-10 text-emerald-600" /><h3 className="mt-4 text-xl font-semibold text-[#06113B]">{content.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{content.description}</p><Link className="mt-5 inline-flex font-semibold text-blue-700 hover:underline" href={`/${locale}/login`}>{t.loginLink}</Link></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3" aria-label={t.onboarding.label}>
        {options.map((option) => {
          const Icon = flowIcons[option.id];
          const selected = option.id === flow;
          return <button key={option.id} type="button" onClick={() => setFlow(option.id)} className={`rounded-2xl border p-4 text-left transition ${selected ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"}`} aria-pressed={selected}><span className={`flex size-9 items-center justify-center rounded-xl ${selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}><Icon className="size-4" /></span><span className="mt-3 block text-sm font-semibold text-[#06113B]">{option.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span></button>;
        })}
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="firstName">{t.firstName}</Label><Input id="firstName" name="firstName" autoComplete="given-name" required /></div>
          <div className="space-y-2"><Label htmlFor="lastName">{t.lastName}</Label><Input id="lastName" name="lastName" autoComplete="family-name" required /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="email">{t.email}</Label><Input id="email" name="email" type="email" placeholder={t.emailPlaceholder} autoComplete="email" required /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="password">{t.password}</Label><Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required /><p className="text-xs text-slate-400">{t.passwordHint}</p></div>
          <div className="space-y-2"><Label htmlFor="confirmPassword">{t.confirmPassword}</Label><Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required /></div>
        </div>

        {flow === "individual" && <div className="space-y-2"><Label htmlFor="preferredLanguage">{t.preferredLanguage}</Label><select id="preferredLanguage" name="preferredLanguage" defaultValue={locale} className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"><option value="ro">{t.languageOptions.ro}</option><option value="en">{t.languageOptions.en}</option></select></div>}
        {flow === "invitation" && <div className="space-y-2"><Label htmlFor="invitationCode">{t.invitationCode}</Label><Input id="invitationCode" name="invitationCode" autoComplete="off" required /><p className="text-xs leading-5 text-slate-500">{t.invitationSafetyNote}</p></div>}
        {flow === "representative" && <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><div className="space-y-2"><Label htmlFor="organizationName">{t.organizationName}</Label><Input id="organizationName" name="organizationName" required /></div><div className="space-y-2"><Label htmlFor="organizationType">{t.organizationType}</Label><select id="organizationType" name="organizationType" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" required>{t.organizationTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div><div className="space-y-2"><Label htmlFor="website">{t.website} <span className="font-normal text-slate-400">({t.optional})</span></Label><Input id="website" name="website" type="url" placeholder="https://" /></div><div className="space-y-2"><Label htmlFor="requestReason">{t.requestReason}</Label><textarea id="requestReason" name="requestReason" rows={4} required className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" /></div><p className="text-xs leading-5 text-slate-500">{t.representativeSafetyNote}</p></div>}

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm leading-5 text-slate-600"><input className="mt-1 size-4 accent-blue-600" type="checkbox" name="acceptTerms" required /><span>{t.acceptTerms}</span></label>
        <Button type="submit" size="lg" className="brand-gradient h-11 w-full" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" /> {t.loading}</> : <>{t.register}<ArrowRight /></>}</Button>
        <p className="text-center text-sm text-slate-500">{t.hasAccount} <Link className="font-semibold text-blue-700 hover:underline" href={`/${locale}/login`}>{t.loginLink}</Link></p>
      </form>
    </div>
  );
}
