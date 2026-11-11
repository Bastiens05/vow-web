import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PlanLock } from "@/components/billing/plan-lock";
import { featureEnabled } from "@/lib/domain/plans";
import { publicCoupleName, venueAggregate } from "@/lib/domain/references";
import { createClient } from "@/lib/supabase/server";
import { hasFeature } from "@/server/features";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Mes références" };

export default async function ReferencesPage() {
  if (!featureEnabled("references")) notFound();
  const session = await requireSession();
  if (session.profile.role !== "vendor" || !session.vendor) redirect("/espace");
  if (!hasFeature({ role: "vendor", plan: session.billing?.plan ?? "essentiel" }, "references")) return <PlanLock feature="references" />;
  const supabase = await createClient();
  const { data } = await supabase
    .from("proven_references")
    .select("id, month, venue_name, town, review, couple_public_name, published, confirmed")
    .eq("vendor_id", session.vendor.id);
  const rows = data ?? [];
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="text-4xl font-semibold tracking-tight">Mes références</h1>
      <p className="mt-2 text-sm text-muted">Un mariage n&apos;apparaît que si le couple confirme votre présence. Les prénoms restent cachés tant qu&apos;ils ne les choisissent pas.</p>
      <ul className="mt-4 text-sm text-muted">
        {venueAggregate(rows).map((item) => (
          <li key={item.venue}>{item.count} mariage{item.count > 1 ? "s" : ""} au {item.venue}</li>
        ))}
      </ul>
      <div className="mt-6 grid gap-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-line p-4">
            <p className="text-sm text-muted">{row.month} · {row.venue_name}{row.town ? `, ${row.town}` : ""}</p>
            <h2 className="mt-1 text-xl font-semibold">{publicCoupleName(row.couple_public_name)}</h2>
            <p className="mt-2 text-sm">{row.review || "Avis en attente."}</p>
            <p className="mt-2 text-xs text-muted">{row.confirmed ? "Vérifié par VOW" : "En attente du couple"} · {row.published ? "Publié" : "Masqué"}</p>
          </article>
        ))}
        {rows.length === 0 ? <p className="text-sm text-muted">Aucune référence pour le moment.</p> : null}
      </div>
    </div>
  );
}
