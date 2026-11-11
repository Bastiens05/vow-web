"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { inviteTeammate, saveAvailability } from "@/server/actions/suite";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export function TeamInviteForm() {
  const [state, action, pending] = useActionState(inviteTeammate, {});
  return (
    <form action={action} className="grid gap-3">
      <Field label="E-mail du membre">
        <TextInput name="email" type="email" required placeholder="assistant@exemple.fr" />
      </Field>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        Inviter dans l&apos;équipe
      </Button>
    </form>
  );
}

export function AvailabilityForm() {
  const [state, action, pending] = useActionState(saveAvailability, {});
  return (
    <form action={action} className="grid gap-3">
      <Field label="Jour">
        <select name="weekday" className="min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm" defaultValue="2">
          {DAYS.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Début">
          <TextInput name="start_time" type="time" required defaultValue="10:00" />
        </Field>
        <Field label="Fin">
          <TextInput name="end_time" type="time" required defaultValue="11:00" />
        </Field>
      </div>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        Ajouter le créneau
      </Button>
    </form>
  );
}
