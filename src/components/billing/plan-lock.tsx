import { featurePlanLabel, type FeatureKey } from "@/lib/domain/plans";

export function PlanLock({ feature }: { feature: FeatureKey }) {
  const plan = featurePlanLabel(feature) ?? "Pro";
  return (
    <section className="rounded-3xl border border-line bg-paper p-6">
      <p className="text-lg font-semibold tracking-tight">Disponible avec {plan}</p>
      <p className="mt-2 text-sm leading-6 text-muted">Cette fonction s&apos;ouvre avec la formule {plan}. Les mariés ne paient rien.</p>
    </section>
  );
}
