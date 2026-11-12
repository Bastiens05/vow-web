"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { formatOffset, type DocumentTemplate } from "@/lib/domain/client-documents";
import type { ActionState } from "@/server/actions/auth";
import { addSuggestedDocument, createClientDocument, deleteClientDocument, moveClientDocument, updateClientDocument } from "@/server/actions/client-documents";

export type TemplateRow = {
  id: string;
  title: string;
  note: string;
  required: boolean;
  offsetDays: number | null;
};

const initial: ActionState = {};

export function ClientDocumentSettings({
  templates,
  suggestions,
}: {
  templates: TemplateRow[];
  suggestions: DocumentTemplate[];
}) {
  const [state, action, pending] = useActionState(createClientDocument, initial);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Documents à fournir par vos clients</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Cette liste est recopiée sur chaque mariage dès que vous et les mariés êtes reliés. Rien n&apos;est ajouté tout seul.
        </p>
      </div>
      {templates.length === 0 ? (
        <p className="text-sm text-muted">Vous n&apos;avez encore rien demandé.</p>
      ) : (
        <ul className="divide-y divide-line">
          {templates.map((item, index) => (
            <li key={item.id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {item.required ? "Obligatoire" : "Facultatif"}
                    {formatOffset(item.offsetDays) ? ` · ${formatOffset(item.offsetDays)}` : ""}
                  </p>
                  {item.note ? <p className="mt-2 text-sm leading-6 text-muted">{item.note}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={moveClientDocument}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="direction" value="up" />
                    <Button type="submit" variant="secondary" disabled={index === 0}>
                      Monter
                    </Button>
                  </form>
                  <form action={moveClientDocument}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="direction" value="down" />
                    <Button type="submit" variant="secondary" disabled={index === templates.length - 1}>
                      Descendre
                    </Button>
                  </form>
                  <form action={deleteClientDocument}>
                    <input type="hidden" name="id" value={item.id} />
                    <Button type="submit" variant="danger">
                      Supprimer
                    </Button>
                  </form>
                </div>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm underline">Modifier</summary>
                <form action={updateClientDocument} className="mt-3 grid gap-3">
                  <input type="hidden" name="id" value={item.id} />
                  <Field label="Intitulé">
                    <TextInput name="title" required defaultValue={item.title} />
                  </Field>
                  <Field label="Consigne" hint="Facultatif.">
                    <TextArea name="note" defaultValue={item.note} className="min-h-20" />
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="required" defaultChecked={item.required} />
                    Obligatoire
                  </label>
                  <Field label="Échéance" hint="Jours avant le mariage : -30 pour J-30. Vide si aucune.">
                    <TextInput name="offset_days" type="number" min={-365} max={365} defaultValue={item.offsetDays ?? ""} />
                  </Field>
                  <Button type="submit" variant="secondary">
                    Enregistrer
                  </Button>
                </form>
              </details>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="grid gap-3 border-t border-line pt-4">
        <h3 className="text-sm font-medium">Ajouter un document</h3>
        <Field label="Intitulé">
          <TextInput name="title" required />
        </Field>
        <Field label="Consigne" hint="Facultatif.">
          <TextArea name="note" className="min-h-20" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="required" defaultChecked />
          Obligatoire
        </label>
        <Field label="Échéance" hint="Facultatif. -30 signifie J-30.">
          <TextInput name="offset_days" type="number" min={-365} max={365} />
        </Field>
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.success ? <Alert tone="success">{state.success}</Alert> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Ajout…" : "Ajouter"}
        </Button>
      </form>
      {suggestions.length > 0 ? (
        <div className="border-t border-line pt-4">
          <h3 className="text-sm font-medium">Suggestions pour votre métier</h3>
          <p className="mt-2 text-sm leading-6 text-muted">Elles restent de côté tant que vous ne les ajoutez pas.</p>
          <ul className="mt-3 space-y-3">
            {suggestions.map((item) => (
              <li key={item.title} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm">{item.title}</p>
                  <p className="text-xs text-muted">
                    {item.required ? "Obligatoire" : "Facultatif"}
                    {formatOffset(item.offsetDays) ? ` · ${formatOffset(item.offsetDays)}` : ""}
                  </p>
                </div>
                <form action={addSuggestedDocument}>
                  <input type="hidden" name="title" value={item.title} />
                  <input type="hidden" name="note" value={item.note} />
                  <input type="hidden" name="offset_days" value={item.offsetDays ?? ""} />
                  {item.required ? <input type="hidden" name="required" value="true" /> : null}
                  <Button type="submit" variant="secondary">
                    Ajouter
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
