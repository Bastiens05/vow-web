import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefingPlayer } from "@/components/wedding/briefing-player";
import { PlanLock } from "@/components/billing/plan-lock";
import { buildBriefing } from "@/lib/domain/briefing";
import { featureEnabled } from "@/lib/domain/plans";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace, listTimeline } from "@/server/data";
import { hasFeature } from "@/server/features";

export const metadata: Metadata = { title: "Briefing" };

export default async function BriefingPage({ params }: { params: Promise<{ id: string }> }) {
  if (!featureEnabled("vocal_briefing")) notFound();
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const vendor = space.session.vendor;
  if (space.role === "vendor" && !hasFeature({ role: "vendor", plan: space.session.billing?.plan ?? "essentiel" }, "vocal_briefing")) {
    return <PlanLock feature="vocal_briefing" />;
  }
  const supabase = await createClient();
  const slots = await listTimeline(id, space.session.userId);
  const [{ data: shared }, { data: note }, { data: heard }] = await Promise.all([
    supabase.from("wedding_briefings").select("pronunciation_note, key_people").eq("wedding_id", id).maybeSingle(),
    vendor ? supabase.from("vendor_brief_notes").select("note").eq("wedding_id", id).eq("vendor_id", vendor.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("briefing_listens").select("id").eq("wedding_id", id).eq("user_id", space.session.userId).limit(1),
  ]);
  const text = buildBriefing({
    names: [space.wedding.partner_one_name, space.wedding.partner_two_name].filter(Boolean).join(" et "),
    pronunciation: shared?.pronunciation_note ?? "",
    people: shared?.key_people ?? "",
    notes: note?.note ?? "",
    steps: slots.slice(0, 3).map((slot) => slot.title),
    address: [space.wedding.venue_name, space.wedding.venue_city].filter(Boolean).join(", "),
    weather: "",
    trade: vendor?.category ?? "",
    heard: (heard ?? []).length > 0,
  });
  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      <h1 className="text-4xl font-semibold tracking-tight">Briefing</h1>
      <p className="mt-2 text-sm text-muted">La lecture ne démarre que si vous appuyez. Le texte reste sur cet appareil.</p>
      <div className="mt-6">
        <BriefingPlayer text={text} weddingId={id} />
      </div>
      <p className="mt-6 text-sm">
        <Link href={`/mariage/${id}/jour`} className="underline">Retour au Jour J</Link>
      </p>
    </div>
  );
}
