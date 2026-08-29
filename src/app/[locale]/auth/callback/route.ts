import { NextResponse, type NextRequest } from "next/server";

import { isLocale, type Locale } from "@/i18n/config";
import { isSafeNextPath } from "@/lib/auth/is-safe-next-path";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, context: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await context.params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "ro";
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const destination = isSafeNextPath(requestedNext, locale) ? requestedNext : `/${locale}/app`;

  if (!code) return NextResponse.redirect(new URL(`/${locale}/login?authError=callback`, request.url));

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.redirect(new URL(`/${locale}/login?authError=configuration`, request.url));

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL(`/${locale}/login?authError=callback`, request.url));

  await supabase.rpc("complete_email_onboarding");
  return NextResponse.redirect(new URL(destination, request.url));
}
