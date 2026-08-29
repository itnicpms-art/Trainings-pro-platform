import type { Locale } from "@/i18n/config";

export function isSafeNextPath(value: string | null | undefined, locale: Locale): value is string {
  if (!value || value.includes("\\") || value.startsWith("//")) return false;

  const allowedRoots = [`/${locale}/app`, `/${locale}/admin`];
  return allowedRoots.some((root) => value === root || value.startsWith(`${root}/`) || value.startsWith(`${root}?`));
}
