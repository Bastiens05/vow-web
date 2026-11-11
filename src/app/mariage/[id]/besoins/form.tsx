"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { saveNeeds } from "@/server/actions/relay";

export function NeedsForm({
  weddingId,
  values,
}: {
  weddingId: string;
  values: {
    vehicle: string;
    access_start: string | null;
    access_end: string | null;
    parking: string;
    power_w: number;
    sockets: number;
    setup_minutes: number;
    space_note: string;
  } | null;
}) {
  const [state, action, pending] = useActionState(saveNeeds, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="wedding_id" value={weddingId} />
      <Field label="Véhicule">
        <TextInput name="vehicle" defaultValue={values?.vehicle ?? ""} placeholder="Utilitaire 20 m³" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Arrivée">
          <TextInput name="access_start" type="time" defaultValue={values?.access_start?.slice(0, 5) ?? ""} />
        </Field>
        <Field label="Fin d'accès">
          <TextInput name="access_end" type="time" defaultValue={values?.access_end?.slice(0, 5) ?? ""} />
        </Field>
      </div>
      <Field label="Stationnement">
        <TextInput name="parking" defaultValue={values?.parking ?? ""} placeholder="Cour nord" />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Puissance (W)">
          <TextInput name="power_w" inputMode="numeric" defaultValue={String(values?.power_w ?? 0)} />
        </Field>
        <Field label="Prises">
          <TextInput name="sockets" inputMode="numeric" defaultValue={String(values?.sockets ?? 0)} />
        </Field>
        <Field label="Montage (min)">
          <TextInput name="setup_minutes" inputMode="numeric" defaultValue={String(values?.setup_minutes ?? 0)} />
        </Field>
      </div>
      <Field label="Espace">
        <TextInput name="space_note" defaultValue={values?.space_note ?? ""} />
      </Field>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer ma fiche"}
      </Button>
    </form>
  );
}
