"use client";

import { useActionState, useState } from "react";
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
  const [kind, setKind] = useState("tester");
  return (
    <form action={action} className="grid gap-3">
      <Field label="Type d'invitation">
        <SelectInput name="grant_type" value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="tester">Testeur</option>
          <option value="lifetime">Offert à vie</option>
        </SelectInput>
      </Field>
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
      <Field label={kind === "lifetime" ? "Formule offerte" : "Formule offerte un an"}>
        <SelectInput name="plan" defaultValue="studio">
          {PLAN_OFFERS.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.label}
            </option>
          ))}
        </SelectInput>
      </Field>
      {kind === "tester" ? (
        <Field label="Remise ensuite (%)" hint="Appliquée à vie après l'année offerte. Enregistrée pour plus tard : le paiement reste fermé.">
          <TextInput name="discount_percent" type="number" min={0} max={100} defaultValue={40} required />
        </Field>
      ) : (
        <p className="text-sm text-muted">Gratuit pour toujours, sur la formule choisie. Le paiement reste fermé.</p>
      )}
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer l'offre"}
      </Button>
    </form>
  );
}
