import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanLock } from "@/components/billing/plan-lock";
import { TECH_FIELDS } from "@/lib/domain/tech-rules";
import { featureEnabled } from "@/lib/domain/plans";
import { createClient } from "@/lib/supabase/server";
import { hasFeature } from "@/server/features";
import { getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Technique" };

export default async function TechPage({ params }: { params: Promise<{ id: string }> }) {
  if (!featureEnabled("tech_sheet")) notFound();
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const couple = space.role === "couple" || space.actingAsCouple;
  if (!couple) {
    const account = { role: "vendor" as const, plan: space.session.billing?.plan ?? "essentiel" };
    if (!hasFeature(account, "tech_sheet")) return <PlanLock feature="tech_sheet" />;
  }
  const supabase = await createClient();
  const [{ data: issues }, { data: venue }] = await Promise.all([
    supabase.from("tech_issues").select("id, code, message").eq("wedding_id", id),
    supabase.from("venue_capabilities").select("share_with_couple").eq("wedding_id", id).maybeSingle(),
  ]);
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="text-4xl font-semibold tracking-tight">Technique</h1>
      <p className="mt-2 text-sm text-muted">La fiche du métier est recopiée sur le mariage. Le lieu indique ce qu&apos;il peut offrir.</p>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {TECH_FIELDS.map((field) => (
          <li key={field} className="rounded-2xl border border-line px-3 py-2 text-sm">{field}</li>
        ))}
      </ul>
      {couple && !venue?.share_with_couple ? (
        <p className="mt-6 text-sm text-muted">Le détail technique reste entre les prestataires.</p>
      ) : (
        <p className="mt-6 text-sm">{couple ? `${issues?.length ?? 0} point${(issues?.length ?? 0) > 1 ? "s" : ""} à regarder.` : `${issues?.length ?? 0} écart${(issues?.length ?? 0) > 1 ? "s" : ""}.`}</p>
      )}
      {!couple ? (
        <ul className="mt-3 grid gap-2">
          {(issues ?? []).map((issue) => (
            <li key={issue.id} className="rounded-2xl bg-mist px-3 py-2 text-sm">{issue.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
