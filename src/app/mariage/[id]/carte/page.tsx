import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { DayMap } from "@/components/wedding/day-map";
import { StopForm } from "@/components/wedding/stop-form";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Carte" };

export default async function MapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const supabase = await createClient();
  const [{ data }, { data: rain }] = await Promise.all([
    supabase.from("wedding_stops").select("*").eq("wedding_id", id).order("sort_order").order("starts_at"),
    supabase.from("rain_plans").select("active").eq("wedding_id", id).maybeSingle(),
  ]);
  const { data: rainStops } = rain?.active
    ? await supabase.from("rain_stops").select("id, label, address").eq("wedding_id", id).order("sort_order")
    : { data: [] };
  const stops = rain?.active && (rainStops ?? []).length > 0
    ? (rainStops ?? []).map((stop) => ({ id: stop.id, label: stop.label, address: stop.address, starts_at: null as string | null }))
    : (data ?? []);
  return (
    <div className="grid gap-4">
      <Card>
        <h1 className="font-serif text-4xl font-normal tracking-tight text-ink sm:text-5xl">{rain?.active ? "Carte · plan pluie" : "Carte du jour"}</h1>
        <p className="mt-2 text-[13px] leading-5 text-ink">
          {rain?.active
            ? "Le plan pluie remplace les lieux prévus. On peut le retirer."
            : "Les adresses saisies, le fond IGN et le temps de trajet entre chaque lieu."}
        </p>
        <div className="mt-4">
          <DayMap places={stops.map((stop) => ({ label: stop.label, address: stop.address }))} />
        </div>
      </Card>
      {stops.map((stop) => {
        const time = stop.starts_at ? stop.starts_at.slice(0, 5) : "";
        return (
          <Card key={stop.id} className="space-y-3">
            <p className="text-[13px] text-ink">{time || "Heure à confirmer"}</p>
            <h2 className="font-serif text-2xl font-normal tracking-tight">{stop.label}</h2>
            <p className="text-[13px] leading-5 text-ink">{stop.address}</p>
          </Card>
        );
      })}
      {space.actingAsCouple ? <StopForm weddingId={id} /> : null}
    </div>
  );
}
