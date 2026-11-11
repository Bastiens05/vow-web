import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { publicSupabaseKey, publicSupabaseUrl } from "@/lib/env";
import { siteUrl } from "@/lib/env";
import { sendProductEmail } from "@/server/mail";
import { notifyWedding } from "@/server/push";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = publicSupabaseUrl();
  const key = publicSupabaseKey();
  if (!url || !key) return Response.json({ ok: false }, { status: 500 });
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase.rpc("due_day_briefs", { p_day: tomorrow });
  if (error) return Response.json({ ok: false }, { status: 500 });
  let sent = 0;
  for (const row of data ?? []) {
    const path = `/mariage/${row.wedding_id}/brief`;
    const body = `Votre brief du jour est prêt. ${siteUrl()}${path}`;
    await notifyWedding([row.user_id], { title: "VOW · Brief du jour", body: "Votre brief du jour est prêt.", url: path });
    if (row.email) await sendProductEmail({ to: row.email, subject: "Votre brief du jour", text: body });
    await supabase.rpc("mark_brief_sent", { p_wedding: row.wedding_id, p_user: row.user_id, p_day: tomorrow });
    sent += 1;
  }
  return Response.json({ ok: true, sent });
}
