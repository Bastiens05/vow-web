import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { parseEvents, renderIcs } from "@/lib/domain/ics";
import { getPublicSupabaseEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const { url, key } = getPublicSupabaseEnv();
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
  const { data } = await supabase.rpc("appointment_event", { p_token: token });
  const events = parseEvents(data ? [data] : []);
  if (events.length === 0) return new Response("Rendez-vous introuvable", { status: 404 });
  return new Response(renderIcs(events), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "inline; filename=rendez-vous.ics",
    },
  });
}
