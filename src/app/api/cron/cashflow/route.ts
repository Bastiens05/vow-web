import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { featureEnabled } from "@/lib/domain/plans";
import { publicSupabaseKey, publicSupabaseUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!featureEnabled("cashflow")) return Response.json({ ok: true, skipped: true });
  const url = publicSupabaseUrl();
  const key = publicSupabaseKey();
  if (!url || !key) return Response.json({ ok: false }, { status: 500 });
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.rpc("rebuild_cashflow");
  if (error) return Response.json({ ok: false }, { status: 500 });
  return Response.json({ ok: true });
}
