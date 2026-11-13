"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { vaultFreshness, vendorVaultCategoryLabel, type VendorVaultCategory } from "@/lib/domain/vendor-vault";
import type { ActionState } from "@/server/actions/auth";
import { shareVaultFiles } from "@/server/actions/vendor-vault";

const initial: ActionState = {};

export function VaultPicker({
  weddingId,
  files,
  vendors,
  today,
}: {
  weddingId: string;
  files: { id: string; title: string; category: VendorVaultCategory; expiresOn: string | null; alertDays: number; shared: boolean }[];
  vendors: { userId: string; label: string }[];
  today: string;
}) {
  const [state, action, pending] = useActionState(shareVaultFiles, initial);
  const expired = files.filter((file) => file.shared && vaultFreshness(file.expiresOn, file.alertDays, today) === "expired");
  return (
    <div className="min-w-0">
      <h3 className="text-lg font-semibold tracking-tight">Piocher dans mon coffre-fort</h3>
      {files.length === 0 ? (
        <p className="mt-2 text-sm leading-6 text-muted">Le coffre-fort est vide.</p>
      ) : (
        <p className="mt-2 max-w-prose text-sm leading-6 text-pretty text-muted">
          Choisissez une ou plusieurs pièces, puis les mariés ou un autre prestataire de ce mariage. Le fichier reste privé.
        </p>
      )}
      {expired.length > 0 ? (
        <p className="mt-3 break-words text-sm leading-6">
          {expired.length === 1
            ? `Un document partagé a expiré : ${expired[0]?.title}. Remplacez-le dans le coffre-fort.`
            : `${expired.length} documents partagés ont expiré : ${expired.map((file) => file.title).join(", ")}. Remplacez-les dans le coffre-fort.`}
        </p>
      ) : null}
      {files.length === 0 ? null : (
        <form action={action} className="mt-4 grid gap-4">
          <input type="hidden" name="wedding_id" value={weddingId} />
          <fieldset>
            <legend className="text-sm font-medium">Documents</legend>
            <ul className="mt-2 space-y-2">
              {files.map((file) => (
                <li key={file.id}>
                  <label className="flex min-w-0 flex-wrap items-center gap-2 break-words text-sm">
                    <input type="checkbox" name="file_id" value={file.id} />
                    {file.title}
                    <span className="text-muted">· {vendorVaultCategoryLabel(file.category)}</span>
                    {vaultFreshness(file.expiresOn, file.alertDays, today) === "expired" ? <span> · expiré</span> : null}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium">Destinataires</legend>
            <ul className="mt-2 space-y-2">
              <li>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="couple" />
                  Les mariés
                </label>
              </li>
              {vendors.map((vendor) => (
                <li key={vendor.userId}>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="recipient_id" value={vendor.userId} />
                    {vendor.label}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          {state.error ? <Alert>{state.error}</Alert> : null}
          {state.success ? <Alert tone="success">{state.success}</Alert> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Partage…" : "Partager"}
          </Button>
        </form>
      )}
      <ButtonLink href="/reglages#coffre-fort" variant="secondary" className="mt-4">
        Ouvrir le coffre-fort
      </ButtonLink>
    </div>
  );
}
