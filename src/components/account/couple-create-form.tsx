"use client";

import { useActionState } from "react";
import { AddressInput } from "@/components/ui/address-input";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { createCoupleWedding } from "@/server/actions/account";

export function CoupleCreateForm() {
  const [state, action, pending] = useActionState(createCoupleWedding, {});
  return (
    <form action={action} className="mb-10 max-w-xl rounded-3xl border border-line bg-paper p-5 sm:p-6">
      <h2 className="text-2xl font-semibold tracking-tight">Créer notre mariage</h2>
      <div className="mt-5 grid gap-4">
        <Field label="Premier prénom">
          <TextInput name="partner_one" required autoComplete="given-name" placeholder="Léa" />
        </Field>
        <Field label="Second prénom">
          <TextInput name="partner_two" required autoComplete="off" placeholder="Hugo" />
        </Field>
        <Field label="Date du mariage">
          <TextInput name="wedding_date" type="date" required />
        </Field>
        <Field label="Ville" hint="Facultatif.">
          <AddressInput name="city" mode="city" placeholder="Bordeaux" />
        </Field>
      </div>
      {state.error ? (
        <div className="mt-4">
          <Alert>{state.error}</Alert>
        </div>
      ) : null}
      <Button type="submit" className="mt-5" disabled={pending}>
        {pending ? "Création…" : "Créer notre mariage"}
      </Button>
      <p className="mt-4 text-sm leading-6 text-muted">Une invitation d&apos;un prestataire reste possible. Ouvrez simplement le lien reçu.</p>
    </form>
  );
}
