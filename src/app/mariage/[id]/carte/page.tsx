import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { StopForm } from "@/components/wedding/stop-form";
import { appleMapsUrl, googleDirectionsUrl, googleMapsUrl } from "@/lib/domain/maps";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Carte" };

export default async function MapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const supabase = await createClient();
  const { data } = await supabase.from("wedding_stops").select("*").eq("wedding_id", id).order("sort_order").order("starts_at");
  const stops = data ?? [];
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-3xl font-semibold tracking-tight">Carte du jour</h2>
        <p className="mt-1 text-sm text-muted">Les adresses restent dans VOW. L&apos;itinéraire s&apos;ouvre dans Plans ou Google Maps.</p>
      </Card>
      {stops.map((stop, index) => {
        const previous = stops[index - 1];
        const time = stop.starts_at ? stop.starts_at.slice(0, 5) : "";
        return (
          <Card key={stop.id} className="space-y-3">
            <p className="text-xs text-muted">{time || "Heure à confirmer"}</p>
            <h3 className="text-xl font-semibold">{stop.label}</h3>
            <p className="text-sm">{stop.address}</p>
            <div className="flex flex-wrap gap-2">
              <a className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm" href={googleMapsUrl(stop.address)}>
                Google Maps
              </a>
              <a className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm" href={appleMapsUrl(stop.address)}>
                Plans
              </a>
              {previous ? (
                <a
                  className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm"
                  href={googleDirectionsUrl(previous.address, stop.address)}
                >
                  Itinéraire
                </a>
              ) : null}
            </div>
          </Card>
        );
      })}
      {space.actingAsCouple ? <StopForm weddingId={id} /> : null}
    </div>
  );
}
