import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PlanLock } from "@/components/billing/plan-lock";
import { featureEnabled } from "@/lib/domain/plans";
import { createClient } from "@/lib/supabase/server";
import { hasFeature } from "@/server/features";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Relances" };

export default async function RelancesPage() {
  if (!featureEnabled("anniversary")) notFound();
  const session = await requireSession();
  if (session.profile.role !== "vendor" || !session.vendor) redirect("/espace");
  if (!hasFeature({ role: "vendor", plan: session.billing?.plan ?? "essentiel" }, "anniversary")) return <PlanLock feature="anniversary" />;
  const supabase = await createClient();
  const { data } = await supabase.from("anniversary_templates").select("id, title, enabled, require_review").eq("vendor_id", session.vendor.id);
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="text-4xl font-semibold tracking-tight">Relances</h1>
      <p className="mt-2 text-sm text-muted">Chaque modèle est éteint. Un envoi attend votre relecture, et chacun peut se désinscrire en un geste.</p>
      <div className="mt-6 grid gap-3">
        {(data ?? []).map((row) => (
          <article key={row.id} className="rounded-2xl border border-line p-4 text-sm">
            <h2 className="text-xl font-semibold">{row.title}</h2>
            <p className="mt-1 text-muted">{row.enabled ? "Activé" : "Éteint"} · {row.require_review ? "relecture demandée" : "envoi direct"}</p>
          </article>
        ))}
        {(data ?? []).length === 0 ? <p className="text-sm text-muted">Aucun modèle. Rien ne part.</p> : null}
      </div>
    </div>
  );
}
