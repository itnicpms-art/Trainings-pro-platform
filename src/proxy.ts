import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/types/database";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const locale = request.nextUrl.pathname.split("/")[1] === "en" ? "en" : "ro";

  const redirectToLogin = () => {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  };

  if (!url || !anonKey) return redirectToLogin();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return redirectToLogin();

  return response;
}

export const config = {
  matcher: [
    "/ro/app/:path*",
    "/en/app/:path*",
    "/ro/admin/:path*",
    "/en/admin/:path*",
  ],
};
