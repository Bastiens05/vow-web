"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BUILTIN_TEMPLATES, type TemplateSlot } from "@/lib/domain/timeline-templates";
import { applyTimelineTemplate, suggestTimelineTemplate } from "@/server/actions/templates";

function clock(value: string) {
  return value.slice(0, 5).replace(":", "h");
}

export function ProgrammeStart({
  weddingId,
  canApply,
  hasSteps = false,
  suggestion,
}: {
  weddingId: string;
  canApply: boolean;
  hasSteps?: boolean;
  suggestion: { id: string; label: string; slots: TemplateSlot[] } | null;
}) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const preview = BUILTIN_TEMPLATES.find((template) => template.id === previewId) ?? null;
  const apply = applyTimelineTemplate.bind(null, weddingId);
  const suggest = suggestTimelineTemplate.bind(null, weddingId);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight">La journée n&apos;est pas encore écrite.</h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          {canApply
            ? "Partez d'un programme type. Vous pourrez changer chaque heure, chaque lieu, chaque prestataire."
            : "Lecture seule. Proposez un programme, le couple le reprend et l'ajuste."}
        </p>
      </div>
      {!canApply && suggestion ? <p className="text-sm">Suggestion envoyée : {suggestion.label}</p> : null}
      {canApply && suggestion ? (
        <div className="rounded-3xl border border-line bg-paper px-4 py-4">
          <p className="text-sm">Suggestion reçue : {suggestion.label}</p>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => setShowSuggestion((value) => !value)}>
              Voir les étapes
            </Button>
          </div>
          {showSuggestion ? (
            <>
              <StepPreview slots={suggestion.slots} />
              <ApplyChoices action={apply} suggestionId={suggestion.id} hasSteps={hasSteps} />
            </>
          ) : null}
        </div>
      ) : null}
      <ul className="grid gap-3">
        {BUILTIN_TEMPLATES.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              onClick={() => setPreviewId(template.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-3xl border px-4 py-4 text-left transition active:scale-[0.99] ${previewId === template.id ? "border-ink bg-paper" : "border-line bg-paper"}`}
            >
              <span>
                <span className="block text-sm font-medium">{template.label}</span>
                <span className="mt-1 block text-xs text-muted">{template.slots.length} étapes</span>
              </span>
              <span className="text-sm text-muted">Voir</span>
            </button>
          </li>
        ))}
      </ul>
      {preview ? (
        <div className="rounded-3xl border border-line bg-paper p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Aperçu</p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight">{preview.label}</h3>
          <p className="mt-1 text-sm text-muted">Un point de départ. Rien n&apos;est posé tant que vous ne confirmez pas.</p>
          <StepPreview slots={preview.slots} />
          {canApply ? (
            <ApplyChoices action={apply} templateId={preview.id} hasSteps={hasSteps} />
          ) : (
            <form action={suggest} className="mt-4">
              <input type="hidden" name="template_id" value={preview.id} />
              <Button type="submit" variant="secondary">Suggérer au couple</Button>
            </form>
          )}
          <Button type="button" variant="ghost" className="mt-2" onClick={() => setPreviewId(null)}>
            Fermer
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ApplyChoices({
  action,
  templateId,
  suggestionId,
  hasSteps,
}: {
  action: (formData: FormData) => Promise<void>;
  templateId?: string;
  suggestionId?: string;
  hasSteps: boolean;
}) {
  return (
    <form action={action} className="mt-4 flex flex-wrap gap-2">
      {templateId ? <input type="hidden" name="template_id" value={templateId} /> : null}
      {suggestionId ? <input type="hidden" name="suggestion_id" value={suggestionId} /> : null}
      {hasSteps ? (
        <>
          <input type="hidden" name="mode" value="replace" />
          <Button type="submit" variant="secondary" name="choice" value="replace">
            Remplacer
          </Button>
          <Button type="submit" variant="ghost" formAction={async (formData) => {
            formData.set("mode", "add");
            await action(formData);
          }}>
            Ajouter
          </Button>
        </>
      ) : (
        <>
          <input type="hidden" name="mode" value="add" />
          <Button type="submit" variant="secondary">
            {suggestionId ? "Appliquer" : "Utiliser ce programme"}
          </Button>
        </>
      )}
    </form>
  );
}

function StepPreview({ slots }: { slots: TemplateSlot[] }) {
  return (
    <ol className="mt-4 space-y-3 border-l border-line pl-4">
      {slots.map((slot) => (
        <li key={`${slot.startsAt}-${slot.title}`}>
          <p className="text-sm font-semibold tabular-nums">{clock(slot.startsAt)}</p>
          <p className="text-sm">{slot.title}</p>
          {slot.place ? <p className="text-xs text-muted">{slot.place}</p> : null}
        </li>
      ))}
    </ol>
  );
}
