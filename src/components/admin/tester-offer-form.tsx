"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { VENDOR_CATEGORIES, categoryLabel } from "@/lib/domain/categories";
import { PLAN_OFFERS } from "@/lib/domain/plans";
import type { ActionState } from "@/server/actions/auth";
import { createInvite } from "@/server/actions/tester-grants";

const initial: ActionState = {};

export function TesterOfferForm() {
  const [state, action, pending] = useActionState(createInvite, initial);
  const [kind, setKind] = useState("tester");
  const [delivery, setDelivery] = useState("email");
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
          <SelectInput name="plan" defaultValue="studio">
            {PLAN_OFFERS.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.label}
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
        <legend className="text-sm font-medium">Envoi</legend>
        <p className="text-sm leading-6 text-muted">
          {delivery === "code"
            ? "Par code : un code à partager. Chaque saisie compte dans le maximum. Après la date limite, il ne peut plus être saisi. Laissez le code vide pour en générer un."
            : "Par e-mail : une invitation nominative. Si la personne a déjà un compte, elle la voit dans sa cloche et l'active. Sinon, l'offre s'applique à l'inscription."}
        </p>
        <SelectInput name="delivery" value={delivery} onChange={(event) => setDelivery(event.target.value)}>
          <option value="email">Par e-mail</option>
          <option value="code">Par code</option>
        </SelectInput>
        {delivery === "email" ? (
          <>
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
          </>
        ) : (
          <>
            <Field label="Utilisations maximum">
              <TextInput name="max_uses" type="number" min={1} max={10000} defaultValue={1} required />
            </Field>
            <Field label="Saisir avant" hint="Facultatif. Après cette date, le code ne s'active plus.">
              <TextInput name="expires_at" type="date" />
            </Field>
            <Field label="Code" hint="Facultatif. 8 caractères minimum si vous le choisissez.">
              <TextInput name="code" autoComplete="off" minLength={8} />
            </Field>
          </>
        )}
      </fieldset>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Créer l'invitation"}
      </Button>
    </form>
  );
}
