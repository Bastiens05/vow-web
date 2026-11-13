"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { FrenchDateInput } from "@/components/ui/french-date";
import { requestStatusLabel, type RequestStatus } from "@/lib/domain/client-documents";
import { safeFileName, validateUpload } from "@/lib/domain/uploads";
import { createClient } from "@/lib/supabase/client";
import type { ActionState } from "@/server/actions/auth";
import { addWeddingDocumentRequest, reviewDocumentRequest, submitDocumentRequest } from "@/server/actions/client-documents";

export type RequestRow = {
  id: string;
  title: string;
  note: string;
  required: boolean;
  dueOn: string | null;
  status: RequestStatus;
  fileName: string | null;
  correctionNote: string;
};

const initial: ActionState = {};

export function DocumentRequestList({
  weddingId,
  userId,
  vendorName,
  requests,
  mode,
}: {
  weddingId: string;
  userId: string;
  vendorName: string;
  requests: RequestRow[];
  mode: "couple" | "vendor" | "read";
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold tracking-tight">Documents demandés</h3>
      <p className="mt-2 text-sm text-muted">{vendorName}</p>
      {requests.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Aucun document demandé pour l&apos;instant.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {requests.map((request) => (
            <li key={request.id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{request.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {request.required ? "Obligatoire" : "Facultatif"}
                    {request.dueOn ? ` · pour le ${new Date(`${request.dueOn}T12:00:00`).toLocaleDateString("fr-FR")}` : ""}
                    {" · "}
                    {requestStatusLabel(request.status)}
                  </p>
                  {request.note ? <p className="mt-2 text-sm leading-6 text-muted">{request.note}</p> : null}
                  {request.correctionNote ? <p className="mt-2 text-sm leading-6">À reprendre : {request.correctionNote}</p> : null}
                  {request.fileName ? <p className="mt-2 text-sm">{request.fileName}</p> : null}
                </div>
              </div>
              {mode === "couple" && (request.status === "needed" || request.status === "correction") ? (
                <SendRequest weddingId={weddingId} userId={userId} requestId={request.id} />
              ) : null}
              {mode === "vendor" && request.status === "sent" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={reviewDocumentRequest}>
                    <input type="hidden" name="id" value={request.id} />
                    <input type="hidden" name="wedding_id" value={weddingId} />
                    <input type="hidden" name="status" value="validated" />
                    <Button type="submit" variant="secondary">
                      Valider
                    </Button>
                  </form>
                  <form action={reviewDocumentRequest} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={request.id} />
                    <input type="hidden" name="wedding_id" value={weddingId} />
                    <input type="hidden" name="status" value="correction" />
                    <Field label="Correction">
                      <TextInput name="note" placeholder="Ce qu'il faut reprendre" />
                    </Field>
                    <Button type="submit" variant="secondary">
                      Demander une correction
                    </Button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {mode === "vendor" ? <OneOffForm weddingId={weddingId} /> : null}
    </div>
  );
}

function SendRequest({ weddingId, userId, requestId }: { weddingId: string; userId: string; requestId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const check = validateUpload(file, "document");
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setPending(true);
    setError(null);
    const supabase = createClient();
    const path = `${weddingId}/${userId}/demande-${requestId}-${safeFileName(file.name)}`;
    const uploaded = await supabase.storage.from("wedding-documents").upload(path, file, { contentType: file.type, upsert: false });
    if (uploaded.error) {
      setPending(false);
      setError(uploaded.error.message);
      return;
    }
    const result = await submitDocumentRequest({ requestId, weddingId, path, fileName: file.name });
    setPending(false);
    if (result.error) {
      await supabase.storage.from("wedding-documents").remove([path]);
      setError(result.error);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="mt-3">
      {error ? <Alert>{error}</Alert> : null}
      <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm">
        {pending ? "Envoi…" : "Envoyer"}
        <input type="file" className="sr-only" disabled={pending} onChange={(event) => void onChange(event)} />
      </label>
    </div>
  );
}

function OneOffForm({ weddingId }: { weddingId: string }) {
  const [state, action, pending] = useActionState(addWeddingDocumentRequest, initial);
  return (
    <form action={action} className="mt-4 grid gap-3 border-t border-line pt-4">
      <h4 className="text-sm font-medium">Demande pour ce mariage seulement</h4>
      <input type="hidden" name="wedding_id" value={weddingId} />
      <Field label="Intitulé">
        <TextInput name="title" required />
      </Field>
      <Field label="Consigne" hint="Facultatif.">
        <TextArea name="note" className="min-h-20" />
      </Field>
      <Field label="Date souhaitée" hint="Facultatif.">
        <FrenchDateInput name="due_on" />
      </Field>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Ajout…" : "Ajouter cette demande"}
      </Button>
    </form>
  );
}
