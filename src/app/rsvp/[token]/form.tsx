"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { submitRsvp } from "@/server/actions/suite";

export function RsvpForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(submitRsvp, {});
  return (
    <form action={action} className="mt-8 grid gap-4">
      <input type="hidden" name="token" value={token} />
      <Field label="Nom">
        <TextInput name="full_name" required autoComplete="name" />
      </Field>
      <fieldset className="grid gap-2 text-sm">
        <legend>Présence</legend>
        <label className="flex min-h-11 items-center gap-3">
          <input type="radio" name="attending" value="yes" defaultChecked /> Je viens
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input type="radio" name="attending" value="no" /> Je ne pourrai pas
        </label>
      </fieldset>
      <Field label="Régime">
        <TextInput name="diet" placeholder="Aucun, végétarien, sans gluten…" />
      </Field>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer"}
      </Button>
    </form>
  );
}
