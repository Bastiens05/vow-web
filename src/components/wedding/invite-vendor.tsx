"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { createInvitation } from "@/server/actions/weddings";

export function InviteVendor({ weddingId }: { weddingId: string }) {
  const [state, action, pending] = useActionState(createInvitation, {});
  return (
    <form action={action} className="mt-4 grid gap-3">
      <input type="hidden" name="wedding_id" value={weddingId} />
      <input type="hidden" name="role" value="vendor" />
      <Field label="E-mail du prestataire">
        <TextInput name="email" type="email" required placeholder="studio@exemple.fr" />
      </Field>
      <p className="text-sm text-muted">
        S&apos;il a déjà un compte prestataire avec cette adresse, le mariage se lie dès qu&apos;il accepte.
      </p>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" variant="secondary" disabled={pending} className="w-fit">
        {pending ? "Envoi…" : "Inviter un prestataire"}
      </Button>
    </form>
  );
}
