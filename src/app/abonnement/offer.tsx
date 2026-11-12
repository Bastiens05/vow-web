"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  PLAN_OFFERS,
  PLAN_SUMMARIES,
  discountedMonthlyCents,
  featuresIntroducedIn,
  formatMonthlyEuros,
  planLabel,
  type VendorPlan,
} from "@/lib/domain/plans";
import type { ActionState } from "@/server/actions/auth";
import { chooseVendorPlan, openBillingPortal, redeemTesterCode, startPaymentSetup } from "@/server/actions/billing";

const initial: ActionState = {};

export function PlanPicker({
  current,
  comped,
  discountPercent = null,
}: {
  current: VendorPlan;
  comped: boolean;
  discountPercent?: number | null;
}) {
  const [state, action, pending] = useActionState(chooseVendorPlan, initial);
  return (
    <div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {PLAN_OFFERS.map((plan) => {
          const selected = current === plan.id;
          const locked = comped && plan.id !== current;
          const items = featuresIntroducedIn(plan.id);
          return (
            <li key={plan.id}>
              <form action={action}>
                <input type="hidden" name="plan" value={plan.id} />
                <button
                  type="submit"
                  disabled={pending || locked}
                  aria-pressed={selected}
                  className={cn(
                    "flex h-full w-full flex-col rounded-3xl border p-5 text-left transition duration-150",
                    selected ? "border-ink bg-paper" : "border-line bg-paper hover:border-ink/40",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                >
                  <p className="text-sm text-muted">{comped && selected ? planLabel(plan.id, true) : plan.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">
                    {discountPercent != null && discountPercent > 0
                      ? formatMonthlyEuros(discountedMonthlyCents(plan.cents, discountPercent))
                      : plan.price}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted">{PLAN_SUMMARIES[plan.id]}</p>
                  <ul className="mt-3 space-y-1 text-sm leading-6">
                    {items.map((item) => (
                      <li key={item.key}>{item.title}</li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm font-medium">
                    {selected ? "Sélectionnée" : locked ? "Offerte en Studio" : pending ? "Enregistrement…" : "Choisir"}
                  </p>
                </button>
              </form>
            </li>
          );
        })}
      </ul>
      {state.error ? (
        <div className="mt-4">
          <Alert>{state.error}</Alert>
        </div>
      ) : null}
      {state.success ? (
        <div className="mt-4">
          <Alert tone="success">{state.success}</Alert>
        </div>
      ) : null}
    </div>
  );
}

export function SubscribeButton({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return (
      <Button type="button" disabled className="w-full sm:w-auto">
        Paiement bientôt disponible
      </Button>
    );
  }
  return <BillingControls enabled hasCustomer={false} testMode={false} />;
}

export function BillingControls({
  enabled,
  hasCustomer,
  testMode,
}: {
  enabled: boolean;
  hasCustomer: boolean;
  testMode: boolean;
}) {
  if (!enabled) {
    return (
      <Button type="button" disabled className="w-full sm:w-auto">
        Paiement bientôt disponible
      </Button>
    );
  }
  return (
    <div className="space-y-3">
      {testMode ? (
        <p className="rounded-2xl border border-line bg-ivory px-4 py-3 text-sm">Mode test</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <form action={startPaymentSetup}>
          <Button type="submit">Ajouter un moyen de paiement</Button>
        </form>
        {hasCustomer ? (
          <form action={openBillingPortal}>
            <Button type="submit" variant="secondary">
              Gérer mon abonnement
            </Button>
          </form>
        ) : (
          <Button type="button" variant="secondary" disabled>
            Gérer mon abonnement
          </Button>
        )}
      </div>
      {hasCustomer ? null : (
        <p className="text-sm text-muted">Le portail s&apos;ouvre après l&apos;enregistrement d&apos;un moyen de paiement.</p>
      )}
    </div>
  );
}

export function RedeemForm() {
  const [state, action, pending] = useActionState(redeemTesterCode, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <Field label="Code">
        <TextInput name="tester_code" autoComplete="off" minLength={8} />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Vérification…" : "Activer"}
      </Button>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
    </form>
  );
}
