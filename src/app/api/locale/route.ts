import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { defaultLocale, isLocale, localeCookieName, localizePath } from "@/i18n/config";

export function GET(request: NextRequest) {
  const requestedLocale = request.nextUrl.searchParams.get("locale") ?? defaultLocale;
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const requestedPath = request.nextUrl.searchParams.get("path") ?? `/${locale}`;
  const path = requestedPath.startsWith("/") ? localizePath(locale, requestedPath) : `/${locale}`;
  const response = NextResponse.redirect(new URL(path, request.url));

  response.cookies.set(localeCookieName, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
