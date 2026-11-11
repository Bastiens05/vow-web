import type { Metadata } from "next";
import { PrintButton } from "@/components/wedding/print-button";
import { buildDayBrief, briefText } from "@/lib/domain/brief";
import { factsFromJson, fieldsForTrade } from "@/lib/domain/profile";
import { isVendorCategory } from "@/lib/domain/categories";
import { formatLongDate, formatSlotTime } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace, listTimeline } from "@/server/data";

export const metadata: Metadata = { title: "Brief du jour" };

export default async function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const slots = await listTimeline(id, space.session.userId);
  const mine = space.actingAsCouple ? slots : slots.filter((slot) => slot.assigneeIds.includes(space.session.userId));
  const supabase = await createClient();
  const { data: slice } = await supabase.rpc("my_profile_slice", { p_wedding: id });
  const facts = factsFromJson(slice);
  const category = space.session.vendor?.category && isVendorCategory(space.session.vendor.category) ? space.session.vendor.category : null;
  const shown = fieldsForTrade(space.actingAsCouple ? null : category)
    .map((field) => ({ label: field.label, value: facts[field.key] ?? "" }))
    .filter((fact) => fact.value.trim().length > 0);
  const brief = buildDayBrief({
    couple: space.title,
    date: formatLongDate(space.wedding.wedding_date),
    steps: mine.map((slot) => ({
      time: formatSlotTime(slot.startsAt).replace(":", "h"),
      title: slot.title,
      place: slot.place,
    })),
    facts: shown,
  });
  return (
    <article className="mx-auto max-w-2xl print:max-w-none">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Brief du jour</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">{brief.title}</h2>
          <p className="mt-1 text-sm text-muted">{brief.date}</p>
        </div>
        <PrintButton />
      </header>
      <section className="mt-6">
        <h3 className="text-lg font-semibold">Vos étapes</h3>
        {brief.steps.length === 0 ? <p className="mt-2 text-sm text-muted">Aucune étape ne vous est assignée.</p> : null}
        <ol className="mt-3 grid gap-3">
          {brief.steps.map((step) => (
            <li key={`${step.time}-${step.title}`} className="rounded-2xl border border-line bg-paper p-4">
              <p className="text-2xl font-semibold">{step.time}</p>
              <p className="font-medium">{step.title}</p>
              {step.place ? (
                <p className="mt-1 text-sm">
                  {step.place}{" "}
                  <a className="underline" href={step.map}>Carte</a>
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-6">
        <h3 className="text-lg font-semibold">Ce qui vous concerne</h3>
        <ul className="mt-3 grid gap-2">
          {brief.facts.map((fact) => (
            <li key={fact.label}>
              <p className="text-xs text-muted">{fact.label}</p>
              <p className="text-sm">{fact.value}</p>
            </li>
          ))}
        </ul>
      </section>
      <pre className="sr-only">{briefText(brief)}</pre>
    </article>
  );
}
