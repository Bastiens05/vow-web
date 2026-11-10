import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { publicSupabaseKey, publicSupabaseUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = publicSupabaseUrl();
  const key = publicSupabaseKey();
  if (!url || !key) return Response.json({ ok: false }, { status: 500 });
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("run_deposit_reminders");
  if (error) return Response.json({ ok: false }, { status: 500 });
  return Response.json({ ok: true, sent: data ?? 0 });
}
