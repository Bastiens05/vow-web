"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, SelectInput, TextArea } from "@/components/ui/field";
import { submitReview } from "@/server/actions/ledger";

export function ReviewForm({
  weddingId,
  vendors,
}: {
  weddingId: string;
  vendors: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(submitReview.bind(null, weddingId), {});
  if (vendors.length === 0) return null;
  return (
    <Card>
      <h2 className="text-lg font-semibold tracking-tight">Laisser un avis</h2>
      <p className="mt-1 text-sm text-muted">Il reste invisible tant que le prestataire ne le publie pas.</p>
      <form action={action} className="mt-3 grid gap-3">
        <Field label="Prestataire">
          <SelectInput name="vendor_id" defaultValue={vendors[0]?.id}>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Note">
          <SelectInput name="rating" defaultValue="5">
            {[5, 4, 3, 2, 1].map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Quelques mots">
          <TextArea name="body" placeholder="Ce qui vous a marqués." />
        </Field>
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.success ? <Alert tone="success">{state.success}</Alert> : null}
        <Button type="submit" disabled={pending}>{pending ? "Envoi…" : "Envoyer l'avis"}</Button>
      </form>
    </Card>
  );
}
