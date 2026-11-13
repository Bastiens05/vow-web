"use client";

import { useState, type ChangeEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { FrenchDateInput } from "@/components/ui/french-date";
import { safeFileName, validateUpload } from "@/lib/domain/uploads";
import {
  VENDOR_VAULT_CATEGORIES,
  vaultFreshness,
  vendorVaultCategoryLabel,
  type VendorVaultCategory,
} from "@/lib/domain/vendor-vault";
import { createClient } from "@/lib/supabase/client";
import { replaceVaultFile, saveVaultFile, updateVaultFile } from "@/server/actions/vendor-vault";

export type VaultFileRow = {
  id: string;
  title: string;
  category: VendorVaultCategory;
  fileName: string;
  expiresOn: string | null;
  alertDays: number;
  autoShare: boolean;
};

export function VendorVaultBoard({ userId, files, today }: { userId: string; files: VaultFileRow[]; today: string }) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadNew(event: ChangeEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choisissez un fichier.");
      return;
    }
    const check = validateUpload(file, "document");
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const path = `coffre/${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const uploaded = await supabase.storage.from("wedding-documents").upload(path, file, { contentType: file.type, upsert: false });
    if (uploaded.error) {
      setUploading(false);
      setError(uploaded.error.message);
      return;
    }
    form.set("storage_path", path);
    form.set("file_name", file.name);
    form.set("mime_type", file.type);
    const result = await saveVaultFile({}, form);
    setUploading(false);
    if (result.error) {
      await supabase.storage.from("wedding-documents").remove([path]);
      setError(result.error);
      return;
    }
    window.location.reload();
  }

  return (
    <div id="coffre-fort" className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Mon coffre-fort</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Déposez une fois les pièces que vous fournissez souvent. Vous les partagerez ensuite, mariage par mariage.
          Le partage automatique est éteint, sauf si vous le cochez.
        </p>
      </div>
      {files.length === 0 ? <p className="text-sm text-muted">Le coffre-fort est vide.</p> : null}
      <ul className="divide-y divide-line">
        {files.map((file) => {
          const freshness = vaultFreshness(file.expiresOn, file.alertDays, today);
          return (
            <li key={file.id} className="py-4">
              <p className="text-sm font-medium">{file.title}</p>
              <p className="mt-1 text-xs text-muted">
                {vendorVaultCategoryLabel(file.category)} · {file.fileName}
                {file.autoShare ? " · partagé avec chaque nouveau mariage" : ""}
              </p>
              {freshness === "soon" ? (
                <p className="mt-2 text-sm">Expire le {new Date(`${file.expiresOn}T12:00:00`).toLocaleDateString("fr-FR")}. Pensez à le remplacer.</p>
              ) : null}
              {freshness === "expired" ? (
                <p className="mt-2 text-sm">Ce document a expiré. Remplacez-le par une nouvelle version.</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <ReplaceFile userId={userId} fileId={file.id} />
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm underline">Modifier</summary>
                <form action={updateVaultFile} className="mt-3 grid gap-3">
                  <input type="hidden" name="id" value={file.id} />
                  <Field label="Intitulé">
                    <TextInput name="title" required defaultValue={file.title} />
                  </Field>
                  <Field label="Catégorie">
                    <SelectInput name="category" defaultValue={file.category}>
                      {VENDOR_VAULT_CATEGORIES.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Expiration" hint="Facultatif.">
                    <FrenchDateInput name="expires_on" defaultValue={file.expiresOn ?? ""} />
                  </Field>
                  <Field label="Alerte (jours avant)">
                    <TextInput name="alert_days" type="number" min={1} max={180} defaultValue={file.alertDays} />
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="auto_share" defaultChecked={file.autoShare} />
                    Partager automatiquement avec chaque nouveau mariage
                  </label>
                  <Button type="submit" variant="secondary">
                    Enregistrer
                  </Button>
                </form>
              </details>
            </li>
          );
        })}
      </ul>
      <form onSubmit={(event) => void uploadNew(event)} className="grid gap-3 border-t border-line pt-4">
        <h3 className="text-sm font-medium">Ajouter un document</h3>
        <Field label="Intitulé">
          <TextInput name="title" required />
        </Field>
        <Field label="Catégorie">
          <SelectInput name="category" defaultValue="rc_pro">
            {VENDOR_VAULT_CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Expiration" hint="Facultatif. Une alerte s'affiche avant cette date.">
          <FrenchDateInput name="expires_on" />
        </Field>
        <Field label="Alerte (jours avant)">
          <TextInput name="alert_days" type="number" min={1} max={180} defaultValue={30} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="auto_share" />
          Partager automatiquement avec chaque nouveau mariage
        </label>
        <Field label="Fichier">
          <input name="file" type="file" required className="text-sm" />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" disabled={uploading}>
          {uploading ? "Envoi…" : "Déposer dans le coffre-fort"}
        </Button>
      </form>
    </div>
  );
}

function ReplaceFile({ userId, fileId }: { userId: string; fileId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const path = `coffre/${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const uploaded = await supabase.storage.from("wedding-documents").upload(path, file, { contentType: file.type, upsert: false });
    if (uploaded.error) {
      setPending(false);
      setError(uploaded.error.message);
      return;
    }
    const result = await replaceVaultFile({ fileId, path, fileName: file.name, mime: file.type });
    setPending(false);
    if (result.error) {
      await supabase.storage.from("wedding-documents").remove([path]);
      setError(result.error);
      return;
    }
    window.location.reload();
  }

  return (
    <div>
      {error ? <Alert>{error}</Alert> : null}
      <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm">
        {pending ? "Remplacement…" : "Remplacer"}
        <input type="file" className="sr-only" disabled={pending} onChange={(event) => void onChange(event)} />
      </label>
    </div>
  );
}
