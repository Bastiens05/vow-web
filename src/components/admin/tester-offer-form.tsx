"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { VENDOR_CATEGORIES, categoryLabel } from "@/lib/domain/categories";
import { PLAN_OFFERS } from "@/lib/domain/plans";
import type { ActionState } from "@/server/actions/auth";
import { createTesterGrant } from "@/server/actions/tester-grants";

const initial: ActionState = {};

export function TesterOfferForm() {
  const [state, action, pending] = useActionState(createTesterGrant, initial);
  return (
    <form action={action} className="grid gap-3">
      <Field label="E-mail">
        <TextInput name="email" type="email" required autoComplete="off" />
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
        <SelectInput name="trade" defaultValue="photographer">
          {VENDOR_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {categoryLabel(value)}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Formule offerte un an">
        <SelectInput name="plan" defaultValue="studio">
          {PLAN_OFFERS.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.label}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Remise ensuite (%)" hint="Appliquée à vie après l'année offerte. Enregistrée pour plus tard : le paiement reste fermé.">
        <TextInput name="discount_percent" type="number" min={0} max={100} defaultValue={40} required />
      </Field>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer l'offre"}
      </Button>
    </form>
  );
}
