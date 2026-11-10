import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { emailChannelEnabled, mailer } from "@/server/mail";
import { publicSupabaseKey, publicSupabaseUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

// Vercel Cron (Hobby) calls this once a day. The work is idempotent:
// each missing item is reminded once per milestone (J-60, J-30, J-14).
export async function GET() {
  const url = publicSupabaseUrl();
  const key = publicSupabaseKey();
  if (!url || !key) return Response.json({ ok: false }, { status: 500 });
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("run_due_reminders");
  if (error) return Response.json({ ok: false }, { status: 500 });
  if (emailChannelEnabled()) {
    await mailer.send({ to: "", subject: "", text: "" });
  }
  return Response.json({ ok: true, sent: data ?? 0 });
}
