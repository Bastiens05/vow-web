"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { VENDOR_CATEGORIES, categoryLabel, isVendorCategory } from "@/lib/domain/categories";
import { PLAN_OFFERS, isVendorPlan } from "@/lib/domain/plans";
import type { ActionState } from "@/server/actions/auth";
import { createInvite } from "@/server/actions/tester-grants";

const initial: ActionState = {};

export function TesterOfferForm({
  prefill,
}: {
  prefill?: { email?: string; trade?: string; plan?: string };
}) {
  const [state, action, pending] = useActionState(createInvite, initial);
  const [kind, setKind] = useState("tester");
  const trade = prefill?.trade && isVendorCategory(prefill.trade) ? prefill.trade : "photographer";
  const plan = prefill?.plan && isVendorPlan(prefill.plan) ? prefill.plan : "studio";
  return (
    <form action={action} className="grid gap-4">
      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">Type</legend>
        <p className="text-sm leading-6 text-muted">
          {kind === "lifetime"
            ? "Offert à vie : la formule choisie est gratuite pour toujours, sans paiement."
            : "Testeur : un an offert, puis une remise à vie. Le taux se règle, 40 % par défaut."}
        </p>
        <SelectInput name="grant_type" value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="tester">Testeur</option>
          <option value="lifetime">Offert à vie</option>
        </SelectInput>
        <Field label="Formule">
          <SelectInput name="plan" defaultValue={plan}>
            {PLAN_OFFERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        {kind === "tester" ? (
          <Field label="Remise ensuite (%)">
            <TextInput name="discount_percent" type="number" min={0} max={100} defaultValue={40} required />
          </Field>
        ) : null}
      </fieldset>
      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">Destinataire</legend>
        <p className="text-sm leading-6 text-muted">
          Invitation par e-mail. Si la personne a déjà un compte, elle la voit dans sa cloche et l&apos;active. Sinon,
          l&apos;offre s&apos;applique à l&apos;inscription.
        </p>
        <Field label="E-mail">
          <TextInput name="email" type="email" required autoComplete="off" defaultValue={prefill?.email ?? ""} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Prénom" hint="Facultatif.">
            <TextInput name="first_name" autoComplete="off" />
          </Field>
          <Field label="Nom" hint="Facultatif.">
            <TextInput name="last_name" autoComplete="off" />
          </Field>
        </div>
        <Field label="Métier">
          <SelectInput name="trade" defaultValue={trade}>
            {VENDOR_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {categoryLabel(value)}
              </option>
            ))}
          </SelectInput>
        </Field>
      </fieldset>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Envoyer l'invitation"}
      </Button>
    </form>
  );
}
