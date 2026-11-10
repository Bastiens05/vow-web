import type { Metadata } from "next";
import Link from "next/link";
import { DayBoard } from "@/components/wedding/day-board";
import { getWeddingSpace, listTimeline } from "@/server/data";

export const metadata: Metadata = { title: "Jour J" };

export default async function WeddingDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const slots = await listTimeline(id, space.session.userId);
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
      <h2 className="text-xs font-medium text-gold-deep">Jour J</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Un retard se règle ici. Tout le monde sur ce mariage le voit tout de suite.
      </p>
      <div className="mt-6">
        <DayBoard weddingId={id} slots={slots} />
      </div>
      <p className="mt-6 text-sm">
        <Link href={`/mariage/${id}/deroulement`} className="underline">
          Modifier le déroulé
        </Link>
      </p>
    </div>
  );
}
