import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";
import { safeNextPath } from "@/lib/domain/paths";
import { getPublicSupabaseEnv } from "@/lib/env";

const OTP_TYPES = ["signup", "invite", "magiclink", "recovery", "email_change", "email"] as const;
type OtpType = (typeof OTP_TYPES)[number];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNextPath(url.searchParams.get("next"));
  const failure = NextResponse.redirect(new URL("/connexion?error=lien", url.origin));
  if (!tokenHash || !type || !OTP_TYPES.includes(type as OtpType)) return failure;

  const { url: supabaseUrl, key } = getPublicSupabaseEnv();
  const success = NextResponse.redirect(new URL(next, url.origin));
  const supabase = createServerClient<Database>(supabaseUrl, key, {
    cookies: {
      getAll() {
        return [];
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          success.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([header, value]) => {
          success.headers.set(header, value);
        });
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    type: type as OtpType,
    token_hash: tokenHash,
  });
  if (error) return failure;
  return success;
}
