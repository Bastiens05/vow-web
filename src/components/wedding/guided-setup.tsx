"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { savePractical } from "@/server/actions/sheets";
import type { Tables } from "@/lib/database.types";

const STEPS = ["Le lieu", "L'accès", "Le contact"] as const;

export function GuidedSetup({
  weddingId,
  practical,
  venue,
}: {
  weddingId: string;
  practical: Tables<"wedding_practical"> | null;
  venue: string;
}) {
  const [step, setStep] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const action = savePractical.bind(null, weddingId);
  const [state, formAction, pending] = useActionState(action, {});
  if (skipped) {
    return <p className="text-sm text-muted">Vous pourrez compléter ces infos plus tard, depuis l&apos;espace de chaque prestataire.</p>;
  }
  return (
    <form action={formAction} className="space-y-6">
      <div className="flex items-center gap-2">
        {STEPS.map((label, index) => (
          <span key={label} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-ink" : "bg-line"}`} />
        ))}
      </div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted">
        {step + 1} / {STEPS.length} · {STEPS[step]}
      </p>
      <div className={step === 0 ? "grid gap-4" : "hidden"}>
        <Field label="Cérémonie" hint={venue ? `Déjà connu : ${venue}` : undefined}>
          <TextInput name="ceremony_address" defaultValue={practical?.ceremony_address || venue} />
        </Field>
        <Field label="Réception">
          <TextInput name="reception_address" defaultValue={practical?.reception_address || venue} />
        </Field>
      </div>
      <div className={step === 1 ? undefined : "hidden"}>
        <Field label="Comment arriver" hint="Un seul texte, réutilisé pour chaque prestataire.">
          <TextInput name="notes" defaultValue={practical?.notes ?? ""} placeholder="Cour intérieure, sonner à l'accueil" />
        </Field>
      </div>
      <div className={step === 2 ? "grid gap-4" : "hidden"}>
        <Field label="Téléphone">
          <TextInput name="partner_one_phone" defaultValue={practical?.partner_one_phone ?? ""} />
        </Field>
        <Field label="Second téléphone">
          <TextInput name="partner_two_phone" defaultValue={practical?.partner_two_phone ?? ""} />
        </Field>
      </div>
      <input type="hidden" name="postal_address" value={practical?.postal_address ?? ""} />
      <input type="hidden" name="key_contacts" value={practical?.key_contacts ?? ""} />
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={() => setStep((value) => value + 1)}>
            Continuer
          </Button>
        ) : (
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={() => (step < STEPS.length - 1 ? setStep((value) => value + 1) : setSkipped(true))}>
          Passer
        </Button>
      </div>
    </form>
  );
}
