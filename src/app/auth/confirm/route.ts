import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";
import { safeNextPath } from "@/lib/domain/paths";
import { getPublicSupabaseEnv } from "@/lib/env";
import { landingPath } from "@/server/auth-landing";

const OTP_TYPES = ["signup", "invite", "magiclink", "recovery", "email_change", "email"] as const;
type OtpType = (typeof OTP_TYPES)[number];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNextPath(url.searchParams.get("next") || readCookie(request, "vow-auth-next"), "/espace");
  const origin = requestOrigin(request, url.origin);
  const failure = NextResponse.redirect(new URL("/connexion?error=lien", origin));
  if (!tokenHash || !type || !OTP_TYPES.includes(type as OtpType)) return failure;

  const { url: supabaseUrl, key } = getPublicSupabaseEnv();
  const pending: Array<{ name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }> = [];
  const supabase = createServerClient<Database>(supabaseUrl, key, {
    cookies: {
      getAll() {
        return [];
      },
      setAll(cookiesToSet) {
        pending.splice(0, pending.length, ...cookiesToSet);
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    type: type as OtpType,
    token_hash: tokenHash,
  });
  if (error) return failure;
  const destination = type === "recovery" || next.startsWith("/mot-de-passe") ? "/mot-de-passe" : await landingPath(supabase, next, true);
  const success = NextResponse.redirect(new URL(destination, origin));
  pending.forEach(({ name, value, options }) => success.cookies.set(name, value, options));
  success.cookies.set("vow-auth-next", "", { path: "/", maxAge: 0 });
  return success;
}

function readCookie(request: Request, name: string) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return { name: part.trim(), value: "" };
        return { name: part.slice(0, index).trim(), value: decodeURIComponent(part.slice(index + 1).trim()) };
      })
      .find((cookie) => cookie.name === name)?.value ?? ""
  );
}

function requestOrigin(request: Request, fallback: string) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return fallback;
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
