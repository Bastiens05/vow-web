import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { featureEnabled } from "@/lib/domain/plans";
import { publicSupabaseKey, publicSupabaseUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!featureEnabled("delivery")) return Response.json({ ok: true, skipped: true });
  const url = publicSupabaseUrl();
  const key = publicSupabaseKey();
  if (!url || !key) return Response.json({ ok: false }, { status: 500 });
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
  const soon = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  const { data } = await supabase.from("delivery_tracks").select("wedding_id, vendor_id, promised_on, step_index").eq("promised_on", soon);
  return Response.json({ ok: true, due: (data ?? []).filter((row) => row.step_index < 4).length });
}
