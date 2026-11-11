"use client";

import { useState, type ChangeEvent } from "react";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { safeFileName, validateUpload } from "@/lib/domain/uploads";
import { createClient } from "@/lib/supabase/client";
import { addVaultItem } from "@/server/actions/vault";

export function VaultBoard({
  weddingId,
  userId,
  checklist,
  stored,
}: {
  weddingId: string;
  userId: string;
  checklist: readonly { kind: string; label: string }[];
  stored: { id: string; kind: string; label: string; file_name: string | null }[];
}) {
  const [error, setError] = useState<string | null>(null);
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
    else window.location.reload();
  }

  return (
    <div className="grid gap-3">
      {error ? <Alert>{error}</Alert> : null}
      {checklist.map((item) => {
        const file = stored.find((row) => row.kind === item.kind);
        return (
          <label key={item.kind} className="flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4">
            <span className="inline-flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${file ? "bg-ok" : "bg-danger"}`} aria-hidden />
              <span>
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-xs text-muted">{file?.file_name ?? "À déposer"}</span>
              </span>
            </span>
            <input
              type="file"
              className="sr-only"
              disabled={pending === item.kind}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const next = event.target.files?.[0];
                event.target.value = "";
                if (next) void upload(item.kind, item.label, next);
              }}
            />
            <span className="text-sm text-muted">{pending === item.kind ? "…" : file ? "Remplacer" : "Ajouter"}</span>
          </label>
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
