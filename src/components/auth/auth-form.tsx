"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthFormProps = { mode: "login" | "register" };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("fullName") ?? "");
    const supabase = createBrowserSupabaseClient();
    if (!supabase) { toast.error("Configurează variabilele Supabase din .env.local înainte de autentificare."); return; }
    setPending(true);
    const result = mode === "register"
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/app` } })
      : await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (result.error) { toast.error(result.error.message); return; }
    toast.success(mode === "register" ? "Contul a fost creat." : "Autentificare reușită.");
    router.push("/app");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {mode === "register" && <div className="space-y-2"><Label htmlFor="fullName">Nume complet</Label><Input id="fullName" name="fullName" placeholder="Numele tău" autoComplete="name" required /></div>}
      <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" placeholder="nume@exemplu.ro" autoComplete="email" required /></div>
      <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password">Parolă</Label><span className="text-xs text-slate-400">Minimum 8 caractere</span></div><Input id="password" name="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></div>
      <Button type="submit" size="lg" className="brand-gradient h-11 w-full" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : mode === "register" ? "Creează cont" : "Autentificare"}{!pending && <ArrowRight />}</Button>
      <p className="text-center text-sm text-slate-500">{mode === "register" ? "Ai deja un cont?" : "Nu ai încă un cont?"} <Link className="font-semibold text-blue-700 hover:underline" href={mode === "register" ? "/login" : "/register"}>{mode === "register" ? "Autentifică-te" : "Înregistrează-te"}</Link></p>
    </form>
  );
}
