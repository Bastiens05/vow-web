"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { BUILTIN_TEMPLATES } from "@/lib/domain/timeline-templates";
import { applyTimelineTemplate, savePersonalTemplate, suggestTimelineTemplate } from "@/server/actions/templates";

export function TemplatePicker({
  weddingId,
  canApply,
  suggestedId,
  personal,
  suggestion,
}: {
  weddingId: string;
  canApply: boolean;
  suggestedId: string;
  personal: Array<{ id: string; name: string }>;
  suggestion: { id: string; label: string } | null;
}) {
  const apply = applyTimelineTemplate.bind(null, weddingId);
  const suggest = suggestTimelineTemplate.bind(null, weddingId);
  const [state, save, pending] = useActionState(savePersonalTemplate.bind(null, weddingId), {});
  return (
    <div className="mb-8 rounded-3xl border border-black/10 bg-white p-4">
      <h2 className="text-lg font-semibold tracking-tight">Modèle de journée</h2>
      <p className="mt-1 text-sm text-muted">
        {canApply
          ? "Un geste pour poser le déroulé, puis vous l'ajustez."
          : "Le couple pose le déroulé. Vous pouvez lui proposer un modèle."}
      </p>
      {!canApply && suggestion ? <p className="mt-4 text-sm">Suggestion envoyée : {suggestion.label}</p> : null}
      {canApply && suggestion ? (
        <form action={apply} className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-ivory px-3 py-3">
          <input type="hidden" name="suggestion_id" value={suggestion.id} />
          <p className="text-sm">Suggestion reçue : {suggestion.label}</p>
          <Button type="submit">Appliquer</Button>
        </form>
      ) : null}
      <form action={canApply ? apply : suggest} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Field label="Modèle">
            <SelectInput name="template_id" defaultValue={suggestedId}>
              {BUILTIN_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Button type="submit">{canApply ? "Utiliser ce modèle" : "Suggérer au couple"}</Button>
      </form>
      {personal.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {personal.map((template) => (
            <form key={template.id} action={canApply ? apply : suggest}>
              <input type="hidden" name="personal_id" value={template.id} />
              <Button type="submit" variant="secondary">
                {canApply ? template.name : `Suggérer ${template.name}`}
              </Button>
            </form>
          ))}
        </div>
      ) : null}
      <form action={save} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Enregistrer ce déroulé">
          <TextInput name="name" placeholder="Mon déroulé type" required />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Enregistrement…" : "Garder comme modèle"}
        </Button>
      </form>
      {state.error ? (
        <div className="mt-3">
          <Alert>{state.error}</Alert>
        </div>
      ) : null}
      {state.success ? (
        <div className="mt-3">
          <Alert tone="success">{state.success}</Alert>
        </div>
      ) : null}
    </div>
  );
}
