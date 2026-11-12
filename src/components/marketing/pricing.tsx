import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  PLAN_OFFERS,
  PLAN_SUMMARIES,
  featuresIntroducedIn,
  vendorSignupHref,
  type VendorPlan,
} from "@/lib/domain/plans";

export function Pricing() {
  return (
    <section id="formules" className="relative overflow-hidden border-t border-line bg-ivory">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--vow-ink)_8%,transparent),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <p className="text-xs font-semibold tracking-[0.28em] text-muted">FORMULES</p>
        <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
          Trois formules pour les prestataires.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted">
          Studio comprend Pro, qui comprend Essentiel. Les mariés ne paient jamais. Aucune commission.
          Le paiement en ligne n&apos;est pas encore ouvert.
        </p>
        <ul className="mt-12 grid gap-4 lg:grid-cols-3 lg:items-stretch">
          {PLAN_OFFERS.map((plan) => (
            <PlanCard key={plan.id} plan={plan.id} featured={plan.id === "pro"} />
          ))}
        </ul>
        <p className="mt-10 max-w-xl text-sm leading-6 text-muted">
          Les couples restent gratuits, sans formule à choisir.{" "}
          <Link href="/inscription?role=couple" className="text-ink underline underline-offset-4">
            Créer un espace mariage
          </Link>
        </p>
      </div>
    </section>
  );
}

function PlanCard({ plan, featured }: { plan: VendorPlan; featured: boolean }) {
  const offer = PLAN_OFFERS.find((item) => item.id === plan);
  if (!offer) return null;
  const items = featuresIntroducedIn(plan);
  return (
    <li
      className={cn(
        "flex h-full flex-col rounded-[2rem] border p-6 lg:p-8",
        featured
          ? "border-ink bg-ink text-ivory shadow-[var(--vow-shadow)] lg:-translate-y-3"
          : "border-line bg-paper text-ink",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium tracking-tight">{offer.label}</p>
        {featured ? (
          <p className={cn("text-xs font-medium uppercase tracking-[0.16em]", featured ? "text-ivory/70" : "text-muted")}>
            Le plus choisi
          </p>
        ) : null}
      </div>
      <p className="mt-4 text-4xl font-semibold tracking-tight">{offer.price}</p>
      <p className={cn("mt-4 text-sm leading-6", featured ? "text-ivory/75" : "text-muted")}>{PLAN_SUMMARIES[plan]}</p>
      <ul className="mt-6 flex-1 space-y-3">
        {items.map((item) => (
          <li key={item.key}>
            <p className="text-sm font-medium tracking-tight">{item.title}</p>
            <p className={cn("mt-0.5 text-sm leading-6", featured ? "text-ivory/70" : "text-muted")}>{item.text}</p>
          </li>
        ))}
      </ul>
      <Link
        href={vendorSignupHref(plan)}
        className={cn(
          "mt-8 inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-medium transition duration-150",
          featured
            ? "bg-ivory text-ink hover:opacity-90"
            : "bg-ink text-ivory hover:opacity-90",
        )}
      >
        Commencer avec {offer.label}
      </Link>
    </li>
  );
}
