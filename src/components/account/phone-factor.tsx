"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { preparePhoneFactor } from "@/server/actions/auth";

export function PhoneFactorForm() {
  const [state, action, pending] = useActionState(preparePhoneFactor, {});
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm leading-6 text-muted">
        Un code par SMS, en plus du mot de passe. L&apos;envoi attend un fournisseur SMS dans Supabase. Rien n&apos;est activé pour le moment.
      </p>
      <Field label="Téléphone" hint="Format international.">
        <TextInput name="phone" type="tel" autoComplete="tel" placeholder="+33600000000" required />
      </Field>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Vérification…" : "Préparer"}
      </Button>
    </form>
  );
}
