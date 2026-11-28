import type { Metadata } from "next";
import Link from "next/link";
import { DayBoard } from "@/components/wedding/day-board";
import { PhotoQueue } from "@/components/wedding/photo-queue";
import { PhotoTools } from "@/components/wedding/photo-tools";
import { JourCache } from "@/components/wedding/jour-cache";
import { categoryLabel, isVendorCategory } from "@/lib/domain/categories";
import { parisClockMinutes } from "@/lib/domain/day";
import { featureEnabled } from "@/lib/domain/plans";
import { todayIso } from "@/lib/domain/format";
import { parseTemplateSlots } from "@/lib/domain/timeline-templates";
import { createClient } from "@/lib/supabase/server";
import { coupleSessionSlot, photoNames } from "@/lib/domain/photo-plan";
import { goldenHour } from "@/lib/domain/solar";
import { getWeddingSpace, listTimeline, type SlotView } from "@/server/data";
import { geocodeAddress } from "@/server/geocode";

export const metadata: Metadata = { title: "Jour J" };

export default async function WeddingDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const slots = await listTimeline(id, space.session.userId);
  const supabase = await createClient();
  const [{ data: rain }, { data: directory }, { data: suggestions }] = await Promise.all([
    supabase.from("rain_plans").select("active").eq("wedding_id", id).maybeSingle(),
    supabase.rpc("wedding_directory", { p_wedding_id: id }),
    supabase.from("timeline_suggestions").select("id, label, slots").eq("wedding_id", id).neq("label", "Séance couple").order("created_at", { ascending: false }).limit(1),
  ]);
  const [{ data: rainRows }, { data: groups }] = await Promise.all([
    supabase.from("rain_slots").select("id, title, starts_at, place, sort_order").eq("wedding_id", id).order("sort_order"),
    supabase.from("photo_groups").select("id, title, place, called_at, sort_order").eq("wedding_id", id).order("sort_order"),
  ]);
  const rainSlots: SlotView[] = (rainRows ?? []).map((slot) => ({
    id: slot.id,
    title: slot.title,
    startsAt: slot.starts_at,
    place: slot.place,
    notes: "",
    sortOrder: slot.sort_order,
    createdAt: "",
    comments: [],
    assigneeIds: [],
    ready: false,
  }));
  const couple = space.role === "couple" || space.actingAsCouple;
  const photographer = space.session.vendor?.category === "photographer";
  const [{ data: weather }, { data: practical }, guestNames, proposals] = await Promise.all([
    supabase.from("weather_settings").select("latitude, longitude").eq("wedding_id", id).maybeSingle(),
    supabase.from("wedding_practical").select("ceremony_address").eq("wedding_id", id).maybeSingle(),
    photographer
      ? supabase.rpc("wedding_guest_names", { p_wedding: id })
      : Promise.resolve({ data: [] as { full_name: string }[], error: null }),
    supabase
      .from("timeline_suggestions")
      .select("id, slots")
      .eq("wedding_id", id)
      .eq("label", "Séance couple")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  const namesUnavailable = Boolean(guestNames.error);
  const names = photoNames((guestNames.data ?? []).map((guest) => guest.full_name));
  const proposed = parseTemplateSlots(proposals.data?.[0]?.slots).find((slot) => slot.title === "Séance couple");
  const proposal = proposals.data?.[0] && proposed
    ? { id: proposals.data[0].id, startsAt: proposed.startsAt, place: proposed.place, fromCouple: proposed.notes === "couple" }
    : null;
  const storedPoint =
    weather?.latitude != null && weather?.longitude != null
      ? { latitude: weather.latitude, longitude: weather.longitude }
      : null;
  const venue = [space.wedding.venue_name, space.wedding.venue_city].filter(Boolean).join(", ");
  const point = storedPoint ?? (await geocodeAddress(practical?.ceremony_address || venue));
  const light = point ? goldenHour(space.wedding.wedding_date, point.latitude, point.longitude) : null;
  const vendorSlots = rain?.active && rainSlots.length > 0 ? rainSlots : slots;
  const suggestion = suggestions?.[0];
  const vendors = (directory ?? [])
    .filter((person) => person.member_role === "vendor")
    .map((person) => ({
      userId: person.user_id,
      fullName:
        person.business_name ||
        person.full_name ||
        (person.category && isVendorCategory(person.category) ? categoryLabel(person.category) : "Prestataire"),
    }));
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 lg:max-w-none">
      <p className="text-sm leading-6 text-muted">
        {couple
          ? "Le programme de votre journée, partagé en direct avec vos prestataires."
          : "Le programme du jour, tenu par les mariés. Vous suivez la version active."}
      </p>
      {featureEnabled("vocal_briefing") ? (
        <Link href={`/mariage/${id}/briefing`} className="mt-4 inline-flex rounded-2xl bg-ink px-4 py-3 text-sm text-paper">
          Écouter le briefing
        </Link>
      ) : null}
      <JourCache
        weddingId={id}
        slots={slots.map((slot) => ({ startsAt: slot.startsAt, title: slot.title, place: slot.place }))}
      />
      <div className="mt-6">
        <DayBoard
          weddingId={id}
          slots={couple ? slots : vendorSlots}
          canControl={space.actingAsCouple}
          userId={space.session.userId}
          vendors={vendors}
          weddingDay={space.wedding.wedding_date === todayIso()}
          nowMinutes={parisClockMinutes()}
          rainSlots={couple ? rainSlots : []}
          rainActive={Boolean(rain?.active)}
          suggestion={
            suggestion
              ? { id: suggestion.id, label: suggestion.label, slots: parseTemplateSlots(suggestion.slots) }
              : null
          }
        />
        {photographer || (couple && proposal) ? (
          <PhotoTools
            weddingId={id}
            names={names}
            namesUnavailable={namesUnavailable}
            session={coupleSessionSlot(slots.map((slot) => ({ title: slot.title, startsAt: slot.startsAt })))}
            proposal={proposal}
            light={light}
            canPropose={photographer}
            canAccept={couple}
            suggestedTime={light?.eveningStart ?? ""}
            fromCouple={proposal?.fromCouple ?? false}
          />
        ) : null}
        <PhotoQueue
          weddingId={id}
          canCall={couple || ["photographer", "videographer", "planner"].includes(space.session.vendor?.category && isVendorCategory(space.session.vendor.category) ? space.session.vendor.category : "")}
          groups={(groups ?? []).map((group) => ({
            id: group.id,
            title: group.title,
            place: group.place ?? "",
            called: Boolean(group.called_at),
          }))}
        />
      </div>
    </div>
  );
}
