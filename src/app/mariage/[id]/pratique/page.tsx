import type { Metadata } from "next";
import { PracticalBoard } from "@/components/wedding/practical-board";
import { Card } from "@/components/ui/card";
import { getPracticalSheet, getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Infos pratiques" };

export default async function PracticalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const sheet = await getPracticalSheet(id);
  return (
    <Card>
      <h2 className="text-lg font-semibold tracking-tight">Infos pratiques</h2>
      <p className="mt-1 mb-6 text-sm leading-6 text-muted">
        {space.role === "couple"
          ? "Une seule fois. Tous les prestataires de ce mariage les voient."
          : "Renseignées par le couple, visibles par les prestataires du mariage."}
      </p>
      <PracticalBoard
        weddingId={id}
        practical={sheet.practical}
        groups={sheet.groups}
        guests={sheet.guests}
        canEditDetails={space.role === "couple"}
      />
    </Card>
  );
}
