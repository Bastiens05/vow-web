import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { getPublicSupabaseEnv } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getPublicSupabaseEnv();

  return createServerClient<Database>(url, key, {
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as CookieOptions);
          });
        } catch {
          // Server Components cannot write cookies. The proxy refreshes the session.
        }
      },
    },
  });
}
