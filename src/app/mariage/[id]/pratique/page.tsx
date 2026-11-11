import type { Metadata } from "next";
import { GuidedSetup } from "@/components/wedding/guided-setup";
import { PracticalBoard } from "@/components/wedding/practical-board";
import { Card } from "@/components/ui/card";
import { canSeeSheet, pratiqueLabel } from "@/lib/domain/trades";
import { getPracticalSheet, getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Infos pratiques" };

export default async function PracticalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const viewRole = space.actingAsCouple ? "couple" : space.role;
  const category = space.actingAsCouple ? null : (space.session.vendor?.category ?? null);
  const couple = viewRole === "couple";
  const showPhotos = !couple && canSeeSheet(viewRole, category, "photos");
  const showGuests = !couple && canSeeSheet(viewRole, category, "guests");
  const sheet = await getPracticalSheet(id, { photos: showPhotos, guests: showGuests });
  if (couple) {
    const venue = [space.wedding.venue_name, space.wedding.venue_city].filter(Boolean).join(", ");
    return (
      <Card>
        <h2 className="text-3xl font-semibold tracking-tight">Préparer l&apos;espace</h2>
        <p className="mt-2 mb-6 text-sm leading-6 text-muted">
          Trois étapes, les infos déjà connues sont reprises. Vous pouvez passer. Les photos de groupe et les invités vivent dans l&apos;espace du métier concerné.
        </p>
        <GuidedSetup weddingId={id} practical={sheet.practical} venue={venue} />
      </Card>
    );
  }
  const label = pratiqueLabel(viewRole, category) ?? "Pratique";
  const title =
    label === "Groupes" ? "Groupes photo" : label === "Invités" ? "Tables et régimes" : label === "Infos" ? "Infos du lieu" : "Infos pratiques";
  return (
    <Card>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 mb-6 text-sm leading-6 text-muted">
        {showPhotos && !showGuests
          ? "Les groupes photo de ce mariage. La liste des invités et les régimes restent chez le couple, le traiteur et le lieu."
          : showGuests && !showPhotos
            ? "Tables et régimes. L'ordre des groupes photo reste chez le couple, le photographe et le vidéaste."
            : "Renseignées par le couple. Vous ne voyez que les fiches de votre métier."}
      </p>
      <PracticalBoard
        weddingId={id}
        practical={sheet.practical}
        groups={sheet.groups}
        guests={sheet.guests}
        canEditDetails={false}
        showPhotos={showPhotos}
        showGuests={showGuests}
        canEditPhotos={showPhotos}
        canEditGuests={showGuests}
      />
    </Card>
  );
}
