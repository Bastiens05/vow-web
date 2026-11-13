"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { PROFILE_FIELDS, filledRatio, type ProfileFacts } from "@/lib/domain/profile";
import { saveWeddingProfile } from "@/server/actions/profile";

export function ProfileForm({ weddingId, facts }: { weddingId: string; facts: ProfileFacts }) {
  const [state, action, pending] = useActionState(saveWeddingProfile.bind(null, weddingId), {});
  const ratio = filledRatio(facts, null);
  return (
    <form action={action} className="grid gap-4">
      <p className="text-sm text-muted">{ratio.percent} % déjà rempli · {ratio.filled}/{ratio.total}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {PROFILE_FIELDS.map((field) => (
          <Field key={field.key} label={field.label} hint={field.hint}>
            {field.key === "diets" || field.key === "key_contacts" || field.key === "story" || field.key === "must_happen" || field.key === "keep_simple" ? (
              <TextArea name={field.key} defaultValue={facts[field.key] ?? ""} className="min-h-20" />
            ) : (
              <TextInput name={field.key} defaultValue={facts[field.key] ?? ""} />
            )}
          </Field>
        ))}
      </div>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" variant="secondary" disabled={pending} className="w-fit">
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}

export function ProfileSlice({ facts, percent }: { facts: { key: string; label: string; value: string }[]; percent: number }) {
  return (
    <Card>
      <p className="text-sm font-medium">{percent} % déjà rempli</p>
      <p className="mt-1 text-sm text-muted">Le couple a déjà saisi ces informations. On ne les redemande pas.</p>
      <ul className="mt-4 grid gap-2">
        {facts.length === 0 ? <li className="text-sm text-muted">Rien pour votre métier pour l&apos;instant.</li> : null}
        {facts.map((fact) => (
          <li key={fact.key}>
            <p className="text-xs text-muted">{fact.label}</p>
            <p className="text-sm">{fact.value}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
