"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { FrenchDateInput } from "@/components/ui/french-date";
import { submitQuote } from "@/server/actions/leads";

export function QuoteForm({ slug, recommendation }: { slug: string; recommendation?: string }) {
  const [state, action, pending] = useActionState(submitQuote, {});
  if (state.success) {
    return <Alert tone="success">{state.success}</Alert>;
  }
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="slug" value={slug} />
      {recommendation ? <input type="hidden" name="reco" value={recommendation} /> : null}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label>
          Société
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Field label="Vos noms">
        <TextInput name="full_names" required placeholder="Marie et Marc" />
      </Field>
      <Field label="E-mail">
        <TextInput name="email" type="email" required />
      </Field>
      <Field label="Téléphone">
        <TextInput name="phone" />
      </Field>
      <Field label="Date du mariage">
        <FrenchDateInput name="wedding_date" />
      </Field>
      <Field label="Lieu">
        <TextInput name="place" placeholder="Bordeaux" />
      </Field>
      <Field label="Nombre d'invités">
        <TextInput name="guest_count" inputMode="numeric" />
      </Field>
      <Field label="Message">
        <TextArea name="message" placeholder="Ce que vous imaginez pour la journée." />
      </Field>
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer la demande"}
      </Button>
    </form>
  );
}
