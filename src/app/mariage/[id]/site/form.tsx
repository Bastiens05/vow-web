"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { saveSite } from "@/server/actions/suite";

export function SiteForm({
  weddingId,
  slug,
  place,
  programme,
  note,
  published,
}: {
  weddingId: string;
  slug: string;
  place: string;
  programme: string;
  note: string;
  published: boolean;
}) {
  const [state, action, pending] = useActionState(saveSite, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="wedding_id" value={weddingId} />
      <Field label="Lien" hint="Lettres, chiffres et tirets.">
        <TextInput name="slug" defaultValue={slug} placeholder="lea-et-hugo" />
      </Field>
      <Field label="Lieu">
        <TextInput name="place" defaultValue={place} />
      </Field>
      <Field label="Programme">
        <TextArea name="programme" defaultValue={programme} />
      </Field>
      <Field label="Un mot">
        <TextArea name="note" defaultValue={note} />
      </Field>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="published" defaultChecked={published} className="h-5 w-5" />
        Publier la page
      </label>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
