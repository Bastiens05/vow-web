import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { isProtectedPath } from "@/lib/domain/paths";
import { hasPublicSupabaseEnv, publicSupabaseKey, publicSupabaseUrl } from "@/lib/env";

type PendingCookie = { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] };

function hasAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => cookie.name.includes("auth-token"));
}

function forward(request: NextRequest, userId: string | null, pending: PendingCookie[], headersToSet: Record<string, string>) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-vow-user-id", userId ?? "");
  requestHeaders.set("x-vow-path", request.nextUrl.pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  pending.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  Object.entries(headersToSet).forEach(([header, value]) => {
    response.headers.set(header, value);
  });
  return response;
}

function redirectToLogin(request: NextRequest, pending: PendingCookie[], headersToSet: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = "/connexion";
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const response = NextResponse.redirect(url);
  pending.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  Object.entries(headersToSet).forEach(([header, value]) => {
    response.headers.set(header, value);
  });
  return response;
}

export async function updateSession(request: NextRequest) {
  const protectedPath = isProtectedPath(request.nextUrl.pathname);
  const authed = hasAuthCookie(request);

  if (!hasPublicSupabaseEnv() || !authed) {
    if (protectedPath) return redirectToLogin(request, [], {});
    return forward(request, null, [], {});
  }

  const url = publicSupabaseUrl();
  const key = publicSupabaseKey();
  if (!url || !key) return forward(request, null, [], {});

  const pending: PendingCookie[] = [];
  let headerBag: Record<string, string> = {};
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        pending.splice(0, pending.length, ...cookiesToSet);
        headerBag = headers;
      },
    },
  });

  let userId: string | null = null;
  try {
    const started = performance.now();
    const { data } = await supabase.auth.getClaims();
    userId = data?.claims?.sub ?? null;
    headerBag["server-timing"] = `auth;dur=${Math.round(performance.now() - started)}`;
  } catch {
    userId = null;
  }

  if (!userId && protectedPath) return redirectToLogin(request, pending, headerBag);
  return forward(request, userId, pending, headerBag);
}
