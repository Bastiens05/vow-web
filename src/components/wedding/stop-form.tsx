"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { addStop } from "@/server/actions/daypack";

export function StopForm({ weddingId }: { weddingId: string }) {
  const [state, action, pending] = useActionState(addStop.bind(null, weddingId), {});
  return (
    <Card>
      <h2 className="text-lg font-semibold">Ajouter un lieu</h2>
      <form action={action} className="mt-3 grid gap-3">
        <Field label="Lieu">
          <TextInput name="label" required placeholder="Cérémonie" />
        </Field>
        <Field label="Adresse">
          <TextInput name="address" required placeholder="Château de la Louvière, Léognan" />
        </Field>
        <Field label="Heure">
          <TextInput name="starts_at" type="time" />
        </Field>
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.success ? <Alert tone="success">{state.success}</Alert> : null}
        <Button type="submit" disabled={pending}>{pending ? "Ajout…" : "Ajouter"}</Button>
      </form>
    </Card>
  );
}
