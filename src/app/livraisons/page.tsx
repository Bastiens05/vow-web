import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PlanLock } from "@/components/billing/plan-lock";
import { atRisk, deliverySteps } from "@/lib/domain/delivery";
import { isVendorCategory } from "@/lib/domain/categories";
import { featureEnabled } from "@/lib/domain/plans";
import { todayIso } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/server";
import { hasFeature } from "@/server/features";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Livraisons" };

export default async function DeliveriesPage() {
  if (!featureEnabled("delivery")) notFound();
  const session = await requireSession();
  if (session.profile.role !== "vendor" || !session.vendor) redirect("/espace");
  if (!hasFeature({ role: "vendor", plan: session.billing?.plan ?? "essentiel" }, "delivery")) return <PlanLock feature="delivery" />;
  const category = isVendorCategory(session.vendor.category) ? session.vendor.category : null;
  const steps = deliverySteps(category);
  const supabase = await createClient();
  const { data } = await supabase.from("delivery_tracks").select("wedding_id, promised_on, step_index, note, file_url").eq("vendor_id", session.vendor.id).order("promised_on");
  const today = todayIso();
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="text-4xl font-semibold tracking-tight">Livraisons en cours</h1>
      <p className="mt-2 text-sm text-muted">Un retard n&apos;est jamais annoncé aux mariés tout seul. Vous avancez l&apos;étape d&apos;un geste.</p>
      <ol className="mt-4 flex flex-wrap gap-2 text-sm">
        {steps.map((step) => <li key={step} className="rounded-full border border-line px-3 py-1">{step}</li>)}
      </ol>
      <ul className="mt-6 grid gap-2">
        {(data ?? []).map((row) => {
          const delivered = row.step_index >= steps.length - 1;
          return (
            <li key={row.wedding_id} className="rounded-2xl border border-line px-4 py-3 text-sm">
              <p>Promis le {row.promised_on}</p>
              <p className="text-muted">{steps[row.step_index] ?? steps[0]}{atRisk(row.promised_on, delivered, today) ? " · à risque" : ""}</p>
              {row.file_url ? <p>{row.file_url}</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
