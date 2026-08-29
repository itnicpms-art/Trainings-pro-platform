"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";

export function LogoutButton({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace(`/${locale}/login`);
    router.refresh();
  }

  return <Button type="button" variant="outline" onClick={handleLogout} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <LogOut />} {label}</Button>;
}
