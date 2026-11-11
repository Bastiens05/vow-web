"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AddressInput } from "@/components/ui/address-input";
import { Field, TextInput } from "@/components/ui/field";
import { addRainSlot, addRainStop, saveWeather } from "@/server/actions/relay";

export function RainForms({ weddingId }: { weddingId: string }) {
  const [stopState, stopAction, stopPending] = useActionState(addRainStop, {});
  const [slotState, slotAction, slotPending] = useActionState(addRainSlot, {});
  const [weatherState, weatherAction, weatherPending] = useActionState(saveWeather, {});
  return (
    <div className="grid gap-6">
      <form action={stopAction} className="grid gap-3">
        <input type="hidden" name="wedding_id" value={weddingId} />
        <Field label="Lieu de repli">
          <TextInput name="label" required placeholder="Cocktail" />
        </Field>
        <Field label="Adresse">
          <AddressInput name="address" required placeholder="Orangerie, château" weddingId={weddingId} />
        </Field>
        {stopState.error ? <Alert>{stopState.error}</Alert> : null}
        {stopState.success ? <Alert tone="success">{stopState.success}</Alert> : null}
        <Button type="submit" variant="secondary" disabled={stopPending}>
          Ajouter le lieu
        </Button>
      </form>
      <form action={slotAction} className="grid gap-3">
        <input type="hidden" name="wedding_id" value={weddingId} />
        <Field label="Étape de repli">
          <TextInput name="title" required placeholder="Cocktail" />
        </Field>
        <Field label="Heure">
          <TextInput name="starts_at" type="time" required />
        </Field>
        <Field label="Où">
          <AddressInput name="place" weddingId={weddingId} placeholder="Orangerie" />
        </Field>
        {slotState.error ? <Alert>{slotState.error}</Alert> : null}
        {slotState.success ? <Alert tone="success">{slotState.success}</Alert> : null}
        <Button type="submit" variant="secondary" disabled={slotPending}>
          Ajouter l&apos;étape
        </Button>
      </form>
      <form action={weatherAction} className="grid gap-3">
        <input type="hidden" name="wedding_id" value={weddingId} />
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="enabled" defaultChecked className="h-5 w-5" />
          Suivi météo du J-7 au jour J
        </label>
        <Field label="Pluie (mm)">
          <TextInput name="rain_mm" inputMode="decimal" defaultValue="1" />
        </Field>
        <Field label="Probabilité de pluie (%)">
          <TextInput name="rain_probability" inputMode="numeric" defaultValue="50" />
        </Field>
        <Field label="Vent (km/h)">
          <TextInput name="wind_kmh" inputMode="numeric" defaultValue="40" />
        </Field>
        {weatherState.error ? <Alert>{weatherState.error}</Alert> : null}
        {weatherState.success ? <Alert tone="success">{weatherState.success}</Alert> : null}
        <Button type="submit" variant="secondary" disabled={weatherPending}>
          Enregistrer les seuils
        </Button>
      </form>
    </div>
  );
}
