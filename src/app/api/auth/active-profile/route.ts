import { NextResponse, type NextRequest } from "next/server";

import { activeProfileCookieName } from "@/lib/auth/constants";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const [supabase, user] = await Promise.all([createServerSupabaseClient(), getCurrentUser()]);
  if (!supabase || !user) return NextResponse.json({ ok: false }, { status: 401 });

  const payload = await request.json().catch(() => null) as { profileId?: unknown } | null;
  if (!payload || typeof payload.profileId !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", payload.profileId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !profile) return NextResponse.json({ ok: false }, { status: 403 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(activeProfileCookieName, profile.id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
