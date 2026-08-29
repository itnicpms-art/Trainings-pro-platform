import { NextResponse, type NextRequest } from "next/server";

import { activeProfileCookieName } from "@/lib/auth/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  if (supabase) await supabase.auth.signOut();

  const response = NextResponse.json({ ok: true });
  response.cookies.set(activeProfileCookieName, "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
