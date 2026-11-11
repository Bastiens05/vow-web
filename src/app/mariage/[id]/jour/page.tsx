import type { Metadata } from "next";
import { DayBoard } from "@/components/wedding/day-board";
import { JourCache } from "@/components/wedding/jour-cache";
import { categoryLabel, isVendorCategory } from "@/lib/domain/categories";
import { parseTemplateSlots } from "@/lib/domain/timeline-templates";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace, listTimeline } from "@/server/data";

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
  const { data: rainStops } = rain?.active
    ? await supabase.from("rain_stops").select("label, address").eq("wedding_id", id).order("sort_order").limit(1)
    : { data: [] };
  const fallback = rainStops?.[0];
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
      {rain?.active ? (
        <p className="mb-4 rounded-2xl border border-line bg-paper px-4 py-3 text-sm">
          Plan pluie activé{fallback ? ` : ${fallback.label} — ${fallback.address}` : ""}.
        </p>
      ) : null}
      <p className="text-sm leading-6 text-muted">Le programme de votre journée, partagé en direct avec vos prestataires.</p>
      <JourCache
        weddingId={id}
        slots={slots.map((slot) => ({ startsAt: slot.startsAt, title: slot.title, place: slot.place }))}
      />
      <div className="mt-6">
        <DayBoard
          weddingId={id}
          slots={slots}
          canControl={space.actingAsCouple}
          userId={space.session.userId}
          vendors={vendors}
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
