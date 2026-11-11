"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import type { ActionState } from "@/server/actions/auth";
import { createTesterCode } from "@/server/actions/billing";

const initial: ActionState = {};

export function CodeForm() {
  const [state, action, pending] = useActionState(createTesterCode, initial);
  return (
    <form action={action} className="grid gap-3">
      <Field label="Libellé">
        <TextInput name="label" required minLength={2} autoComplete="off" />
      </Field>
      <Field label="Code" hint="8 caractères minimum. Il n'est pas réaffiché.">
        <TextInput name="code" required minLength={8} autoComplete="off" />
      </Field>
      <Field label="Utilisations maximum">
        <TextInput name="max_uses" type="number" min={1} defaultValue="1" required />
      </Field>
      <Field label="Saisir avant" hint="Facultatif.">
        <TextInput name="expires_at" type="date" />
      </Field>
      <Field label="Accès jusqu'au" hint="Vide : accès sans date de fin.">
        <TextInput name="access_until" type="date" />
      </Field>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Création…" : "Créer le code"}
      </Button>
    </form>
  );
}
