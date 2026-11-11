import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { weatherBreach } from "@/lib/domain/weather";
import { publicSupabaseKey, publicSupabaseUrl } from "@/lib/env";
import { sendProductEmail } from "@/server/mail";
import { notifyWedding } from "@/server/push";
import { forecastFor, geocodePlace, weatherAlertsEnabled } from "@/server/weather";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!weatherAlertsEnabled()) return Response.json({ ok: true, skipped: true });
  const url = publicSupabaseUrl();
  const key = publicSupabaseKey();
  if (!url || !key) return Response.json({ ok: false }, { status: 500 });
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("due_weather_weddings");
  if (error) return Response.json({ ok: false }, { status: 500 });

  let sent = 0;
  for (const row of data ?? []) {
    let latitude = row.latitude;
    let longitude = row.longitude;
    if (latitude === null || longitude === null) {
      const point = await geocodePlace(row.place);
      if (!point) {
        await supabase.rpc("record_weather_alert", { p_wedding: row.wedding_id, p_body: "" });
        continue;
      }
      latitude = point.latitude;
      longitude = point.longitude;
      await supabase.rpc("set_venue_point", { p_wedding: row.wedding_id, p_lat: latitude, p_lng: longitude });
    }
    const forecast = await forecastFor({ latitude, longitude }, row.wedding_date);
    const body = forecast
      ? weatherBreach(forecast, {
          rainMm: Number(row.rain_mm),
          rainProbability: row.rain_probability,
          windKmh: row.wind_kmh,
        })
      : null;
    await supabase.rpc("record_weather_alert", { p_wedding: row.wedding_id, p_body: body ?? "" });
    if (!body) continue;
    sent += 1;
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!adminKey) continue;
    const reader = createClient<Database>(url, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: members } = await reader.from("wedding_members").select("user_id").eq("wedding_id", row.wedding_id);
    const ids = (members ?? []).map((member) => member.user_id);
    await notifyWedding(ids, { title: "VOW · Météo", body, url: `/mariage/${row.wedding_id}/pluie` });
    const { data: profiles } = ids.length
      ? await reader.from("profiles").select("email").in("id", ids)
      : { data: [] };
    await Promise.all(
      (profiles ?? [])
        .filter((profile) => profile.email)
        .map((profile) => sendProductEmail({ to: profile.email, subject: "Météo · VOW", text: body })),
    );
  }
  return Response.json({ ok: true, sent });
}
