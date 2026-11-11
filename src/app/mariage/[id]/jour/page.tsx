import type { Metadata } from "next";
import { DayBoard } from "@/components/wedding/day-board";
import { JourCache } from "@/components/wedding/jour-cache";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace, listTimeline } from "@/server/data";

export const metadata: Metadata = { title: "Jour J" };

export default async function WeddingDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const slots = await listTimeline(id, space.session.userId);
  const supabase = await createClient();
  const { data: rain } = await supabase.from("rain_plans").select("active").eq("wedding_id", id).maybeSingle();
  const { data: rainStops } = rain?.active
    ? await supabase.from("rain_stops").select("label, address").eq("wedding_id", id).order("sort_order").limit(1)
    : { data: [] };
  const fallback = rainStops?.[0];
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 lg:max-w-none">
      {rain?.active ? (
        <p className="mb-4 rounded-2xl border border-line bg-paper px-4 py-3 text-sm">
          Plan pluie activé{fallback ? ` : ${fallback.label} — ${fallback.address}` : ""}.
        </p>
      ) : null}
      <h2 className="text-xs font-medium text-gold-deep">
        {space.actingAsCouple ? "Jour J · vous tenez les horaires" : "Jour J · horaires en direct"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        {space.actingAsCouple
          ? "Un retard se règle ici. Les prestataires le voient tout de suite."
          : "Lecture seule. Le couple décale les horaires et vous prévient."}
      </p>
      <JourCache
        weddingId={id}
        slots={slots.map((slot) => ({ startsAt: slot.startsAt, title: slot.title, place: slot.place }))}
      />
      <div className="mt-6">
        <DayBoard weddingId={id} slots={slots} canControl={space.actingAsCouple} userId={space.session.userId} />
      </div>
    </div>
  );
}
