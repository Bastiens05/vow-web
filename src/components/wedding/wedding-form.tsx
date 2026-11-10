"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { createWedding } from "@/server/actions/weddings";

export function WeddingForm() {
  const [state, action, pending] = useActionState(createWedding, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Premier prénom">
        <TextInput name="partner_one" required placeholder="Léa" />
      </Field>
      <Field label="Second prénom">
        <TextInput name="partner_two" required placeholder="Hugo" />
      </Field>
      <Field label="Date du mariage">
        <TextInput name="wedding_date" type="date" required />
      </Field>
      <Field label="Lieu">
        <TextInput name="venue_name" placeholder="Château de la Louvière" />
      </Field>
      <Field label="Ville du lieu">
        <TextInput name="venue_city" placeholder="Léognan" />
      </Field>
      {state.error ? (
        <div className="sm:col-span-2">
          <Alert>{state.error}</Alert>
        </div>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Création…" : "Créer le mariage"}
      </Button>
    </form>
  );
}
