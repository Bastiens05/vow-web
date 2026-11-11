"use server";

import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/server/session";

export async function rememberVenuePoint(weddingId: string, latitude: number, longitude: number): Promise<void> {
  if (!weddingId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
  await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from("weather_settings").select("wedding_id").eq("wedding_id", weddingId).maybeSingle();
  if (data) {
    await supabase.from("weather_settings").update({ latitude, longitude }).eq("wedding_id", weddingId);
    return;
  }
  await supabase.from("weather_settings").insert({
    wedding_id: weddingId,
    enabled: false,
    latitude,
    longitude,
  });
}
