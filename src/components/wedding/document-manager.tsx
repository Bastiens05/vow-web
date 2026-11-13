"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { FileDrop } from "@/components/ui/file-drop";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatFileSize } from "@/lib/domain/format";
import { safeFileName, validateUpload } from "@/lib/domain/uploads";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { SignaturePanel } from "@/components/wedding/signature-panel";
import { deleteDocument } from "@/server/actions/space";
import { requestSignature } from "@/server/actions/signatures";
import type { Tables } from "@/lib/database.types";

export function DocumentManager({
  weddingId,
  userId,
  documents,
  names,
  requests,
  canRequest,
  canSign,
}: {
  weddingId: string;
  userId: string;
  documents: Tables<"documents">[];
  names: Record<string, string>;
  requests: Tables<"signature_requests">[];
  canRequest: boolean;
  canSign: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  async function onFiles(files: File[]) {
    setChosen(files.map((file) => file.name));
    setPending(true);
    setError(null);
    let failed = false;
    const supabase = createClient();
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      if (!file) continue;
      const check = validateUpload(file, "document");
      if (!check.ok) {
        setError(check.error);
        failed = true;
        continue;
      }
      setProgress(Math.round((index / files.length) * 100));
      const path = `${weddingId}/${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const uploaded = await supabase.storage.from("wedding-documents").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploaded.error) {
        setError(uploaded.error.message);
        failed = true;
        continue;
      }
      const inserted = await supabase.from("documents").insert({
        wedding_id: weddingId,
        uploaded_by: userId,
        storage_path: path,
        file_name: file.name.slice(0, 180),
        mime_type: file.type,
        size_bytes: file.size,
      });
      if (inserted.error) {
        await supabase.storage.from("wedding-documents").remove([path]);
        setError(inserted.error.message);
        failed = true;
      }
    }
    setProgress(failed ? null : 100);
    setPending(false);
    if (!failed) setAdding(false);
    router.refresh();
  }

  const showDrop = adding || pending;

  return (
    <div className="min-w-0 space-y-4">
      {documents.length === 0 ? <p className="text-sm leading-6 text-muted">Aucun document pour l&apos;instant.</p> : null}
      {documents.length > 0 ? (
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {documents.map((document) => {
          const request = requests.find((item) => item.document_id === document.id);
          return (
          <li key={document.id} className="flex flex-col gap-3 px-4 py-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-words font-medium">{document.file_name}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatFileSize(document.size_bytes)} · {names[document.uploaded_by] ?? "Membre"} · {formatDateTime(document.created_at)}
                </p>
                {request?.status === "signed" ? (
                  <div className="mt-2">
                    <Badge>Signé</Badge>
                  </div>
                ) : null}
                {request?.status === "pending" ? <p className="mt-2 text-xs text-gold-deep">Signature demandée</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/api/documents/${document.id}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-line px-3 text-sm hover:border-gold"
                >
                  Télécharger
                </a>
                {request?.status === "signed" ? (
                  <a
                    href={`/api/documents/${document.id}/certificate`}
                    className="inline-flex min-h-11 items-center rounded-full border border-line px-3 text-sm"
                  >
                    Certificat
                  </a>
                ) : null}
                {canRequest && document.mime_type === "application/pdf" && !request ? (
                  <form action={requestSignature}>
                    <input type="hidden" name="document_id" value={document.id} />
                    <input type="hidden" name="wedding_id" value={weddingId} />
                    <Button type="submit" variant="secondary">
                      Demander la signature
                    </Button>
                  </form>
                ) : null}
                <form action={deleteDocument}>
                  <input type="hidden" name="id" value={document.id} />
                  <input type="hidden" name="wedding_id" value={weddingId} />
                  <Button type="submit" variant="ghost">
                    Retirer
                  </Button>
                </form>
              </div>
            </div>
            {canSign && request?.status === "pending" ? (
              <SignaturePanel requestId={request.id} weddingId={weddingId} />
            ) : null}
            {request?.status === "signed" ? (
              <p className="text-sm text-muted">
                Signé par {request.signer_name}
                {request.signed_at ? ` · ${formatDateTime(request.signed_at)}` : ""}. Signature électronique simple (eIDAS SES).
              </p>
            ) : null}
          </li>
          );
        })}
      </ul>
      ) : null}
      {showDrop ? (
        <FileDrop
          accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,text/plain,image/jpeg,image/png,image/webp"
          multiple
          compact
          disabled={pending}
          hint="PDF, Word, texte, JPG, PNG ou WebP · 10 Mo maximum."
          names={chosen}
          progress={progress}
          onFiles={(files) => void onFiles(files)}
        />
      ) : (
        <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
          Ajouter un document
        </Button>
      )}
      {error ? <Alert>{error}</Alert> : null}
    </div>
  );
}
