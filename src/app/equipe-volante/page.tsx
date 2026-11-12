import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PlanLock } from "@/components/billing/plan-lock";
import { canAddCrew, payCents, type CrewRate } from "@/lib/domain/crew";
import { featureEnabled } from "@/lib/domain/plans";
import { formatEuros } from "@/lib/domain/money";
import { createClient } from "@/lib/supabase/server";
import { hasFeature } from "@/server/features";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Mon équipe" };

export default async function CrewPage() {
  if (!featureEnabled("crew")) notFound();
  const session = await requireSession();
  if (session.profile.role !== "vendor" || !session.vendor) redirect("/espace");
  if (!hasFeature({ role: "vendor", plan: session.billing?.plan ?? "essentiel" }, "crew")) return <PlanLock feature="crew" />;
  const supabase = await createClient();
  const { data: members } = await supabase.from("crew_members").select("id, name, role, rate_cents, rate_kind, active").eq("vendor_id", session.vendor.id);
  const active = (members ?? []).filter((member) => member.active).length;
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="text-4xl font-semibold tracking-tight">Mon équipe</h1>
      <p className="mt-2 text-sm text-muted">{active}/15 personnes actives. Un renfort ne voit que ses mariages, ses étapes et votre contact. Pas de paie automatique.</p>
      {!canAddCrew(active) ? <p className="mt-3 text-sm">Le plafond de 15 personnes actives est atteint.</p> : null}
      <ul className="mt-6 grid gap-2">
        {(members ?? []).map((member) => (
          <li key={member.id} className="rounded-2xl border border-line px-4 py-3 text-sm">
            <p className="font-medium">{member.name}</p>
            <p className="text-muted">{member.role || "Rôle à préciser"} · {formatEuros(payCents(member.rate_kind as CrewRate, member.rate_cents, 60))} / h de référence</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
