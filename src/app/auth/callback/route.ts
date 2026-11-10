import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";
import { safeNextPath } from "@/lib/domain/paths";
import { getPublicSupabaseEnv } from "@/lib/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const failure = NextResponse.redirect(new URL("/connexion?error=lien", url.origin));
  if (!code) return failure;

  const { url: supabaseUrl, key } = getPublicSupabaseEnv();
  const success = NextResponse.redirect(new URL(next, url.origin));
  const supabase = createServerClient<Database>(supabaseUrl, key, {
    cookies: {
      getAll() {
        return request.headers
          .get("cookie")
          ?.split(";")
          .map((part) => {
            const index = part.indexOf("=");
            if (index === -1) return { name: part.trim(), value: "" };
            return {
              name: part.slice(0, index).trim(),
              value: decodeURIComponent(part.slice(index + 1).trim()),
            };
          }) ?? [];
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return failure;
  return success;
}
