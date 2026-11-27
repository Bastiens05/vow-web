import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { DayMap } from "@/components/wedding/day-map";
import { StopForm } from "@/components/wedding/stop-form";
import { factsFromJson } from "@/lib/domain/profile";
import { mapPlaces } from "@/lib/domain/map-places";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Carte" };

export default async function MapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const supabase = await createClient();
  const [{ data }, { data: rain }, { data: practical }, { data: slice }] = await Promise.all([
    supabase.from("wedding_stops").select("*").eq("wedding_id", id).order("sort_order").order("starts_at"),
    supabase.from("rain_plans").select("active").eq("wedding_id", id).maybeSingle(),
    supabase.from("wedding_practical").select("ceremony_address").eq("wedding_id", id).maybeSingle(),
    supabase.rpc("my_profile_slice", { p_wedding: id }),
  ]);
  const { data: rainStops } = rain?.active
    ? await supabase.from("rain_stops").select("id, label, address").eq("wedding_id", id).order("sort_order")
    : { data: [] };
  const stops = rain?.active && (rainStops ?? []).length > 0
    ? (rainStops ?? []).map((stop) => ({ id: stop.id, label: stop.label, address: stop.address, starts_at: null as string | null }))
    : (data ?? []);
  const facts = factsFromJson(slice);
  const places = mapPlaces({
    ceremony: facts.ceremony_address || practical?.ceremony_address || "",
    reception: facts.reception_address || "",
    stops: stops.map((stop) => ({ label: stop.label, address: stop.address })),
  });
  return (
    <div className="grid gap-4">
      <Card>
        <h1 className="font-serif text-4xl font-normal tracking-tight text-ink sm:text-5xl">{rain?.active ? "Carte · plan pluie" : "Carte du jour"}</h1>
        <p className="mt-1 text-sm text-muted">
          {rain?.active
            ? "Le plan pluie remplace les lieux prévus. On peut le retirer."
            : "Les adresses saisies, le fond IGN et le temps de trajet entre chaque lieu."}
        </p>
        <div className="mt-4">
          <DayMap places={places} />
        </div>
      </Card>
      {stops.map((stop) => {
        const time = stop.starts_at ? stop.starts_at.slice(0, 5) : "";
        return (
          <Card key={stop.id} className="space-y-3">
            <p className="text-xs text-muted">{time || "Heure à confirmer"}</p>
            <p className="text-lg font-medium">{stop.label}</p>
            <p className="text-sm">{stop.address}</p>
          </Card>
        );
      })}
      {space.actingAsCouple ? <StopForm weddingId={id} /> : null}
    </div>
  );
}
