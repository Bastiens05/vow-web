"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { safeFileName, validateUpload } from "@/lib/domain/uploads";
import { createClient } from "@/lib/supabase/client";
import { addVaultItem, removeVaultItem } from "@/server/actions/vault";

export function VaultBoard({
  weddingId,
  userId,
  checklist,
  stored,
}: {
  weddingId: string;
  userId: string;
  checklist: readonly { kind: string; label: string }[];
  stored: { id: string; kind: string; label: string; file_name: string | null; url?: string | null }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [custom, customAction, customPending] = useActionState(addVaultItem.bind(null, weddingId), {});

  async function upload(kind: string, label: string, file: File) {
    const check = validateUpload(file, "document");
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setPending(kind);
    setError(null);
    const supabase = createClient();
    const path = `${weddingId}/${userId}/vault-${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const uploaded = await supabase.storage.from("wedding-documents").upload(path, file, { contentType: file.type, upsert: false });
    if (uploaded.error) {
      setPending(null);
      setError(uploaded.error.message);
      return;
    }
    const form = new FormData();
    form.set("kind", kind);
    form.set("label", label);
    form.set("storage_path", path);
    form.set("file_name", file.name);
    form.set("mime_type", file.type);
    const result = await addVaultItem(weddingId, {}, form);
    setPending(null);
    if (result.error) setError(result.error);
    else {
      setError(null);
      setNotice("Ajouté au coffre");
      window.location.reload();
    }
  }

  return (
    <div className="grid gap-3">
      {error ? <Alert>{error}</Alert> : null}
      {notice ? <p role="status" className="text-sm text-muted">{notice}</p> : null}
      {checklist.map((item) => {
        const files = stored.filter((row) => row.kind === item.kind);
        return (
          <div key={item.kind} id={item.kind} className="scroll-mt-24 rounded-2xl border border-line bg-paper px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${files.length ? "bg-ok" : "bg-danger"}`} aria-hidden />
                <span className="text-sm font-medium">{item.label}</span>
              </span>
              <div className="mt-3">
                <FileDrop
                  accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.doc,.docx,.txt"
                  disabled={pending === item.kind}
                  hint="PDF, Word, texte ou image · 10 Mo maximum."
                  progress={pending === item.kind ? 40 : null}
                  onFiles={(files) => {
                    const next = files[0];
                    if (next) void upload(item.kind, item.label, next);
                  }}
                />
              </div>
            </div>
            {files.length === 0 ? <p className="mt-2 text-xs text-muted">À déposer</p> : null}
            <ul className="mt-2 grid gap-2">
              {files.map((file) => (
                <li key={file.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{file.file_name || file.label}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    {file.url ? (
                      <a className="underline" href={file.url} target="_blank" rel="noreferrer">
                        Ouvrir
                      </a>
                    ) : null}
                    <form action={removeVaultItem}>
                      <input type="hidden" name="wedding_id" value={weddingId} />
                      <input type="hidden" name="id" value={file.id} />
                      <button type="submit" className="text-muted underline">
                        Retirer
                      </button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <form action={customAction} className="rounded-2xl border border-line bg-paper p-4">
        <Field label="Autre document">
          <TextInput name="label" placeholder="Nom du document" required minLength={2} />
        </Field>
        <input type="hidden" name="kind" value="custom" />
        <input type="hidden" name="storage_path" value={`${weddingId}/custom`} />
        <input type="hidden" name="file_name" value="note" />
        {custom.error ? <div className="mt-3"><Alert>{custom.error}</Alert></div> : null}
        {custom.success ? <div className="mt-3"><Alert tone="success">{custom.success}</Alert></div> : null}
        <Button type="submit" variant="secondary" className="mt-3" disabled={customPending}>
          {customPending ? "…" : "Ajouter à la liste"}
        </Button>
      </form>
    </div>
  );
}
