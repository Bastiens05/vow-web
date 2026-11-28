import type { Metadata } from "next";
import { DayMap } from "@/components/wedding/day-map";
import { GuidedSetup } from "@/components/wedding/guided-setup";
import { MusicList } from "@/components/wedding/music-list";
import { PracticalBoard } from "@/components/wedding/practical-board";
import { PracticalJourney } from "@/components/wedding/practical-journey";
import { ProfileSlice } from "@/components/wedding/profile-form";
import { HashScroll } from "@/components/ui/hash-scroll";
import { Card } from "@/components/ui/card";
import { mapPlaces } from "@/lib/domain/map-places";
import { factsFromJson, fieldsForTrade, filledRatio, visibleFacts } from "@/lib/domain/profile";
import { isVendorCategory } from "@/lib/domain/categories";
import { canSeeMusicPlaylist, canSeeSheet } from "@/lib/domain/trades";
import { listWeddingSongs } from "@/server/actions/music";
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
  const showPlaylist = canSeeMusicPlaylist(viewRole, category);
  const supabase = await createClient();
  const { data: music } = showMusic
    ? await supabase.from("wedding_music").select("notes").eq("wedding_id", id).maybeSingle()
    : { data: null };
  const playlist = showPlaylist ? await listWeddingSongs(id) : { songs: [], pending: false };
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
        <div className="grid min-w-0 gap-8">
          <Card>
            <h2 className="text-3xl font-semibold tracking-tight">Préparer l&apos;espace</h2>
            <p className="mt-2 mb-6 text-sm leading-6 text-muted">
              Trois étapes, les infos déjà connues sont reprises. Vous pouvez passer. Les photos de groupe et les invités vivent dans l&apos;espace du métier concerné.
            </p>
            <GuidedSetup weddingId={id} practical={sheet.practical} venue={venue} />
          </Card>
          <MusicList weddingId={id} songs={playlist.songs} canEdit pending={playlist.pending} notes={music?.notes ?? ""} />
        </div>
      );
    }
    return (
      <div id="lieu" className="scroll-mt-24">
        <HashScroll />
        <h1 className="font-serif text-4xl font-normal tracking-tight text-ink sm:text-5xl">Le mariage, une seule fois</h1>
        <p className="mt-2 mb-6 text-sm text-muted">Quatre étapes. L&apos;adresse saisie ici est celle de la carte.</p>
        <PracticalJourney
          weddingId={id}
          facts={{ ...facts, ceremony_address: facts.ceremony_address || sheet.practical?.ceremony_address || venue }}
          phones={{ one: sheet.practical?.partner_one_phone ?? "", two: sheet.practical?.partner_two_phone ?? "" }}
          notes={sheet.practical?.notes ?? ""}
        />
        <div className="my-8">
          <DayMap
            places={mapPlaces({
              ceremony: facts.ceremony_address || sheet.practical?.ceremony_address || venue,
              reception: facts.reception_address || "",
              stops: [],
            })}
          />
        </div>
        <div className="mb-8 min-w-0">
          <MusicList
            weddingId={id}
            songs={playlist.songs}
            canEdit
            pending={playlist.pending}
            notes={music?.notes ?? ""}
          />
        </div>
        <PracticalBoard
          weddingId={id}
          practical={sheet.practical}
          groups={sheet.groups}
          guests={sheet.guests}
          canEditDetails={false}
          showDetails={false}
          showPhotos
          showGuests
          canEditPhotos
          canEditGuests
          showMusic={false}
        />
      </div>
    );
  }
  const ratio = filledRatio(facts, trade);
  const known = fieldsForTrade(trade)
    .map((field) => ({ key: field.key, label: field.label, value: visibleFacts(facts, trade)[field.key] ?? "" }))
    .filter((field) => field.value.length > 0);
  const composeGroups = trade === "planner";
  const groupesOnly = showPhotos && !showGuests && !showMusic;
  const board = {
    weddingId: id,
    practical: sheet.practical,
    groups: sheet.groups,
    guests: sheet.guests,
    canEditDetails: false,
    musicNotes: music?.notes ?? "",
    canEditMusic: false,
  };
  return (
    <div className="grid gap-4">
      <ProfileSlice facts={known} percent={ratio.percent} />
      {showPhotos ? (
        <Card>
          <h2 className="text-lg font-semibold tracking-tight">Groupes photo</h2>
          <p className="mt-1 mb-6 text-sm leading-6 text-muted">
            {composeGroups
              ? "Les groupes photo de ce mariage. La liste des invités et les régimes restent chez le couple, le traiteur et le lieu."
              : "L'ordre, le titre, les personnes et la note. Les mariés composent la liste."}
          </p>
          <PracticalBoard
            {...board}
            showDetails={false}
            showHeadings={false}
            showPhotos
            showGuests={false}
            showMusic={false}
            canEditPhotos={composeGroups}
            canEditGuests={false}
          />
        </Card>
      ) : null}
      {showGuests ? (
        <Card>
          <h2 className="text-lg font-semibold tracking-tight">Tables et régimes</h2>
          <p className="mt-1 mb-6 text-sm leading-6 text-muted">
            Tables et régimes. L&apos;ordre des groupes photo reste chez le couple, le photographe et le vidéaste.
          </p>
          <PracticalBoard
            {...board}
            showDetails={false}
            showHeadings={false}
            showPhotos={false}
            showGuests
            showMusic={false}
            canEditPhotos={false}
            canEditGuests
          />
        </Card>
      ) : null}
      {showPlaylist ? (
        <Card>
          <MusicList weddingId={id} songs={playlist.songs} canEdit={false} pending={playlist.pending} notes={music?.notes ?? ""} />
        </Card>
      ) : null}
      {showMusic && !showPlaylist ? (
        <Card>
          <h2 className="text-lg font-semibold tracking-tight">Musique</h2>
          <p className="mt-1 mb-6 text-sm leading-6 text-muted">Pour le DJ. Les autres métiers ne voient pas cette note.</p>
          <PracticalBoard
            {...board}
            showDetails={false}
            showHeadings={false}
            showPhotos={false}
            showGuests={false}
            showMusic
            canEditPhotos={false}
            canEditGuests={false}
          />
        </Card>
      ) : null}
      {groupesOnly ? null : (
      <Card>
        <h2 className="text-lg font-semibold tracking-tight">Infos pratiques</h2>
        <p className="mt-1 mb-6 text-sm leading-6 text-muted">Renseignées par le couple. Vous ne voyez que les fiches de votre métier.</p>
        <PracticalBoard
          {...board}
          showDetails
          showHeadings={false}
          showPhotos={false}
          showGuests={false}
          showMusic={false}
          canEditPhotos={false}
          canEditGuests={false}
        />
      </Card>
      )}
    </div>
  );
}
