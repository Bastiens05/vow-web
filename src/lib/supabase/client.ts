"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { getPublicSupabaseEnv } from "@/lib/env";

export function createClient() {
  const { url, key } = getPublicSupabaseEnv();
  return createBrowserClient<Database>(url, key);
}
