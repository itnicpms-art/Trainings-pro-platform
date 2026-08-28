"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { locales, localizePath, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  locale: Locale;
  label: string;
  inverted?: boolean;
};

export function LanguageSwitcher({ locale, label, inverted = false }: LanguageSwitcherProps) {
  const pathname = usePathname();

  return (
    <div className={cn("inline-flex items-center rounded-lg border p-0.5", inverted ? "border-white/20 bg-white/10" : "border-slate-200 bg-slate-50")} role="group" aria-label={label}>
      {locales.map((item) => (
        <Link
          key={item}
          href={`/api/locale?locale=${item}&path=${encodeURIComponent(localizePath(item, pathname))}`}
          hrefLang={item}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-7 min-w-9 px-2 text-xs",
            item === locale
              ? inverted ? "bg-white text-[#06113B] hover:bg-white" : "bg-white text-blue-700 shadow-sm hover:bg-white"
              : inverted ? "text-blue-100 hover:bg-white/10 hover:text-white" : "text-slate-500",
          )}
          aria-current={item === locale ? "page" : undefined}
        >
          {item.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
