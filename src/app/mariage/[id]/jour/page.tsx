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
      <h2 className="text-xs font-medium text-gold-deep">
        {space.role === "couple" ? "Jour J · vous tenez les horaires" : "Jour J · horaires en direct"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        {space.role === "couple"
          ? "Un retard se règle ici. Les prestataires le voient tout de suite."
          : "Lecture seule. Le couple décale les horaires et vous prévient."}
      </p>
      <div className="mt-6">
        <DayBoard weddingId={id} slots={slots} canControl={space.role === "couple"} />
      </div>
      {space.role === "vendor" ? (
        <p className="mt-6 text-sm">
          <Link href={`/mariage/${id}/deroulement`} className="underline">
            Modifier le déroulé
          </Link>
        </p>
      ) : null}
    </div>
  );
}
