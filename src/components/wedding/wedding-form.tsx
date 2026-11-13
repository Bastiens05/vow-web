"use client";

import { useActionState } from "react";
import { PartnerFields } from "@/components/wedding/partner-fields";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { FrenchDateInput } from "@/components/ui/french-date";
import { createWedding } from "@/server/actions/weddings";

export function WeddingForm() {
  const [state, action, pending] = useActionState(createWedding, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <PartnerFields />
      <Field label="Date du mariage">
        <FrenchDateInput name="wedding_date" required />
      </Field>
      <Field label="Lieu">
        <TextInput name="venue_name" placeholder="Château de la Louvière" />
      </Field>
      <Field label="Ville du lieu">
        <TextInput name="venue_city" placeholder="Léognan" />
      </Field>
      <Field label="E-mail du couple" hint="Facultatif. L'invitation part tout de suite.">
        <TextInput name="couple_email" type="email" placeholder="maries@exemple.fr" />
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
