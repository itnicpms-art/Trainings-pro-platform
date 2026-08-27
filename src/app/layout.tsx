import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = { title: { default: "Trainings PRO", template: "%s | Trainings PRO" }, description: "Platforma NICPMS Academy pentru experiențe educaționale sigure și scalabile." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ro" className="h-full antialiased"><body className="min-h-full bg-slate-50 text-slate-950">{children}<Toaster richColors /></body></html>;
}
