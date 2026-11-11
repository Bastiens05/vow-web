"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { bookAppointment } from "@/server/actions/suite";

export function BookForm({
  slug,
  slots,
  weddingId,
  defaultName,
  defaultEmail,
}: {
  slug: string;
  slots: { starts_at: string }[];
  weddingId?: string;
  defaultName?: string;
  defaultEmail?: string;
}) {
  const [state, action, pending] = useActionState(bookAppointment, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="slug" value={slug} />
      {weddingId ? <input type="hidden" name="wedding_id" value={weddingId} /> : null}
      <Field label="Nom">
        <TextInput name="full_name" required defaultValue={defaultName} />
      </Field>
      <Field label="E-mail">
        <TextInput name="email" type="email" required defaultValue={defaultEmail} />
      </Field>
      <Field label="Créneau">
        <select name="starts_at" required className="min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm">
          {slots.map((slot) => (
            <option key={slot.starts_at} value={slot.starts_at}>
              {new Date(slot.starts_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Un mot">
        <TextInput name="note" />
      </Field>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" disabled={pending || slots.length === 0}>
        {slots.length === 0 ? "Aucun créneau ce jour" : pending ? "Réservation…" : "Réserver"}
      </Button>
    </form>
  );
}
