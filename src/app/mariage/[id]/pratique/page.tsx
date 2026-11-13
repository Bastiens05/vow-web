import type { Metadata } from "next";
import { GuidedSetup } from "@/components/wedding/guided-setup";
import { PracticalBoard } from "@/components/wedding/practical-board";
import { ProfileForm, ProfileSlice } from "@/components/wedding/profile-form";
import { HashScroll } from "@/components/ui/hash-scroll";
import { Card } from "@/components/ui/card";
import { factsFromJson, fieldsForTrade, filledRatio, visibleFacts } from "@/lib/domain/profile";
import { isVendorCategory } from "@/lib/domain/categories";
import { canSeeSheet, pratiqueLabel } from "@/lib/domain/trades";
import { createClient } from "@/lib/supabase/server";
import { getPracticalSheet, getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Infos pratiques" };

export default async function PracticalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const viewRole = space.actingAsCouple ? "couple" : space.role;
  const category = space.actingAsCouple ? null : (space.session.vendor?.category ?? null);
  const couple = viewRole === "couple";
  const showPhotos = canSeeSheet(viewRole, category, "photos");
  const showGuests = canSeeSheet(viewRole, category, "guests");
  const sheet = await getPracticalSheet(id, { photos: showPhotos, guests: showGuests });
  const showMusic = canSeeSheet(viewRole, category, "music");
  const supabase = await createClient();
  const { data: music } = showMusic
    ? await supabase.from("wedding_music").select("notes").eq("wedding_id", id).maybeSingle()
    : { data: null };
  const { data: slice } = await supabase.rpc("my_profile_slice", { p_wedding: id });
  const facts = factsFromJson(slice);
  const trade = category && isVendorCategory(category) ? category : null;
  if (couple) {
    const venue = [space.wedding.venue_name, space.wedding.venue_city].filter(Boolean).join(", ");
    const practical = sheet.practical;
    const filled = Boolean(
      practical &&
        [practical.postal_address, practical.ceremony_address, practical.reception_address, practical.partner_one_phone, practical.notes, practical.key_contacts].some(
          (value) => value.trim().length > 0,
        ),
    );
    const known = filled || Boolean(space.wedding.venue_name) || space.members.some((member) => member.role === "vendor");
    if (!known) {
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
    return (
      <div id="lieu" className="scroll-mt-24">
        <HashScroll />
        <h2 className="text-3xl font-semibold tracking-tight">Le mariage, une seule fois</h2>
        <p className="mt-2 mb-6 text-sm text-muted">Chaque information est saisie ici. Le photographe, le traiteur et les autres n&apos;en reçoivent que la part qui les concerne.</p>
        <ProfileForm weddingId={id} facts={facts} />
        <h2 className="mt-10 text-3xl font-semibold tracking-tight">Infos du lieu</h2>
        <p className="mt-2 mb-6 text-sm text-muted">Les photos de groupe et les invités se remplissent dans Documents, chez le photographe ou le traiteur.</p>
        <PracticalBoard
          weddingId={id}
          practical={sheet.practical}
          groups={sheet.groups}
          guests={sheet.guests}
          canEditDetails
          showPhotos
          showGuests
          canEditPhotos
          canEditGuests
          showMusic
          musicNotes={music?.notes ?? ""}
          canEditMusic
        />
      </div>
    );
  }
  const label = pratiqueLabel(viewRole, category) ?? "Pratique";
  const title =
    label === "Groupes" ? "Groupes photo" : label === "Invités" ? "Tables et régimes" : label === "Musique" ? "Musique" : label === "Infos" ? "Infos du lieu" : "Infos pratiques";
  const ratio = filledRatio(facts, trade);
  const known = fieldsForTrade(trade)
    .map((field) => ({ key: field.key, label: field.label, value: visibleFacts(facts, trade)[field.key] ?? "" }))
    .filter((field) => field.value.length > 0);
  return (
    <div className="grid gap-4">
      <ProfileSlice facts={known} percent={ratio.percent} />
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
        showMusic={showMusic}
        musicNotes={music?.notes ?? ""}
        canEditMusic={false}
      />
    </Card>
    </div>
  );
}
