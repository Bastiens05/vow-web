import type { Metadata } from "next";
import { DayBoard } from "@/components/wedding/day-board";
import { JourCache } from "@/components/wedding/jour-cache";
import { getWeddingSpace, listTimeline } from "@/server/data";

export const metadata: Metadata = { title: "Jour J" };

export default async function WeddingDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const slots = await listTimeline(id, space.session.userId);
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
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
        <DayBoard weddingId={id} slots={slots} canControl={space.actingAsCouple} />
      </div>
    </div>
  );
}
