import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
export const metadata: Metadata = { title: "Înregistrare" };
export default function RegisterPage() { return <AuthShell title="Creează contul tău" description="Începe cu un profil individual, pe care îl poți extinde ulterior."><AuthForm mode="register" /></AuthShell>; }
