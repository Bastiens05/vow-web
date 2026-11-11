import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { publicSupabaseUrl } from "@/lib/env";

export function serviceClient() {
  const url = publicSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
