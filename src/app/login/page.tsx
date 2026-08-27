import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
export const metadata: Metadata = { title: "Autentificare" };
export default function LoginPage() { return <AuthShell title="Bine ai revenit" description="Autentifică-te pentru a continua în spațiul tău Trainings PRO."><AuthForm mode="login" /></AuthShell>; }
