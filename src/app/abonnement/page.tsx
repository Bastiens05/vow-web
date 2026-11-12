import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BillingControls, PlanPicker, RedeemForm } from "@/app/abonnement/offer";
import { vendorAccess } from "@/lib/domain/billing";
import { effectiveVendorPlan, planLabel, testerOfferLabel } from "@/lib/domain/plans";
import { categoryLabel } from "@/lib/domain/categories";
import { requireSession } from "@/server/session";
import { stripeEnabled, stripeTestMode } from "@/server/stripe";

export const metadata: Metadata = { title: "Abonnement" };

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ paiement?: string; regle?: string }>;
}) {
  const query = await searchParams;
  const session = await requireSession();
  if (session.profile.role !== "vendor") redirect("/espace");
  const plan = effectiveVendorPlan(session.billing?.plan);
  const comped = Boolean(session.billing?.comped);
  const access = vendorAccess({
    role: "vendor",
    isAdmin: session.isAdmin,
    status: session.billing?.status ?? null,
    trialEndsAt: session.billing?.trial_ends_at ?? null,
    testerUntil: session.billing?.tester_until ?? null,
  });
  const trade = session.vendor ? categoryLabel(session.vendor.category) : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 lg:py-12">
      <p className="text-xs font-medium text-gold-deep">Prestataires</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Trois formules.</h1>
      <p className="mt-3 max-w-xl text-base leading-7 text-muted">
        Studio comprend Pro, qui comprend Essentiel. Les mariés ne paient jamais. Aucune commission.{" "}
        {stripeEnabled() ? "Carte et prélèvement SEPA." : "Le paiement en ligne reste fermé."}
      </p>
      <div className="mt-8">
        <PlanPicker
          current={plan}
          comped={comped}
          discountPercent={session.billing?.free_until && session.billing.discount_percent != null && !comped ? session.billing.discount_percent : null}
        />
      </div>
      <section className="mt-4 rounded-3xl border border-line bg-paper p-6">
        <p className="text-sm text-muted">
          {session.vendor?.business_name ?? "Votre activité"}
          {trade ? ` · ${trade}` : ""}
        </p>
        <p className="mt-3 text-lg font-semibold">Votre formule : {planLabel(plan, comped)}</p>
        {session.billing?.free_until && session.billing.discount_percent != null && !comped ? (
          <p className="mt-3 text-sm leading-6">{testerOfferLabel(session.billing.free_until, session.billing.discount_percent)}</p>
        ) : null}
        <p className="mt-3 text-sm leading-6">
          {comped
            ? "Cette formule vous est offerte, sans paiement ni date de fin."
            : access.reason === "trial" && access.daysLeft !== null
              ? `Il vous reste ${access.daysLeft} jour${access.daysLeft > 1 ? "s" : ""} d'essai.`
              : access.reason === "tester"
                ? session.billing?.tester_until
                  ? `Accès test jusqu'au ${new Date(session.billing.tester_until).toLocaleDateString("fr-FR")}.`
                  : "Accès test, sans date de fin."
                : access.reason === "active"
                  ? "Abonnement en cours."
                  : access.reason === "admin"
                    ? "Compte administrateur : l'accès n'est pas limité."
                    : "L'essai est terminé. Vos mariages restent enregistrés."}
        </p>
        {query.paiement === "indisponible" ? (
          <p className="mt-3 text-sm">Le paiement n&apos;a pas pu s&apos;ouvrir. Les prix Stripe doivent exister.</p>
        ) : null}
        {query.paiement === "client" ? (
          <p className="mt-3 text-sm">Ajoutez d&apos;abord un moyen de paiement.</p>
        ) : null}
        {query.regle === "1" ? <p className="mt-3 text-sm">Moyen de paiement enregistré.</p> : null}
        <div className="mt-6">
          <BillingControls
            enabled={stripeEnabled()}
            testMode={stripeTestMode()}
            hasCustomer={Boolean(session.billing?.stripe_customer_id)}
          />
        </div>
      </section>
      {!comped ? (
        <section className="mt-4 rounded-3xl border border-line bg-paper p-6">
          <h2 className="text-lg font-semibold tracking-tight">Code test</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Un code ouvre l&apos;accès, sans paiement. Le nombre d&apos;utilisations et la date de fin sont fixés par
            l&apos;administration.
          </p>
          <div className="mt-4">
            <RedeemForm />
          </div>
        </section>
      ) : null}
    </div>
  );
}
