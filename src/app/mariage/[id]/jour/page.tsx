import type { Metadata } from "next";
import { DayBoard } from "@/components/wedding/day-board";
import { JourCache } from "@/components/wedding/jour-cache";
import { categoryLabel, isVendorCategory } from "@/lib/domain/categories";
import { parisClockMinutes } from "@/lib/domain/day";
import { todayIso } from "@/lib/domain/format";
import { parseTemplateSlots } from "@/lib/domain/timeline-templates";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace, listTimeline, type SlotView } from "@/server/data";

export const metadata: Metadata = { title: "Jour J" };

export default async function WeddingDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const slots = await listTimeline(id, space.session.userId);
  const supabase = await createClient();
  const [{ data: rain }, { data: directory }, { data: suggestions }] = await Promise.all([
    supabase.from("rain_plans").select("active").eq("wedding_id", id).maybeSingle(),
    supabase.rpc("wedding_directory", { p_wedding_id: id }),
    supabase.from("timeline_suggestions").select("id, label, slots").eq("wedding_id", id).order("created_at", { ascending: false }).limit(1),
  ]);
  const { data: rainRows } = await supabase.from("rain_slots").select("id, title, starts_at, place, sort_order").eq("wedding_id", id).order("sort_order");
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
      </div>
    </div>
  );
}
