import type { Metadata } from "next";
import { PracticalBoard } from "@/components/wedding/practical-board";
import { Card } from "@/components/ui/card";
import { canSeeSheet, pratiqueLabel } from "@/lib/domain/trades";
import { getPracticalSheet, getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Infos pratiques" };

export default async function PracticalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const category = space.session.vendor?.category ?? null;
  const showPhotos = canSeeSheet(space.role, category, "photos");
  const showGuests = canSeeSheet(space.role, category, "guests");
  const sheet = await getPracticalSheet(id, { photos: showPhotos, guests: showGuests });
  const label = pratiqueLabel(space.role, category) ?? "Pratique";
  const title =
    label === "Groupes" ? "Groupes photo" : label === "Invités" ? "Tables et régimes" : label === "Infos" ? "Infos du lieu" : "Infos pratiques";
  return (
    <Card>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 mb-6 text-sm leading-6 text-muted">
        {space.role === "couple"
          ? "Adresses, photos de groupe et invités. Chaque prestataire ne voit que ce qui concerne son métier."
          : showPhotos && !showGuests
            ? "Les groupes photo de ce mariage. La liste des invités et les régimes restent chez le couple, le traiteur et le lieu."
            : showGuests && !showPhotos
              ? "Tables et régimes. L’ordre des groupes photo reste chez le couple, le photographe et le vidéaste."
              : "Renseignées par le couple. Vous ne voyez que les fiches de votre métier."}
      </p>
      <PracticalBoard
        weddingId={id}
        practical={sheet.practical}
        groups={sheet.groups}
        guests={sheet.guests}
        canEditDetails={space.role === "couple"}
        showPhotos={showPhotos}
        showGuests={showGuests}
        canEditPhotos={showPhotos}
        canEditGuests={showGuests}
      />
    </Card>
  );
}
