"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FileDrop } from "@/components/ui/file-drop";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { VENDOR_CATEGORIES, categoryLabel } from "@/lib/domain/categories";
import type { QuoteDraft } from "@/lib/domain/quote-extract";
import { safeFileName, validateUpload } from "@/lib/domain/uploads";
import { createClient } from "@/lib/supabase/client";
import { confirmQuoteInvite, startQuoteIntake } from "@/server/actions/quotes";

export function QuoteIntake({ weddingId, userId }: { weddingId: string; userId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState<(QuoteDraft & { id: string }) | null>(null);
  const [state, action, saving] = useActionState(confirmQuoteInvite.bind(null, weddingId), {});

  async function onFile(file: File) {
    const check = validateUpload(file, "document");
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setPending(true);
    setError(null);
    const supabase = createClient();
    const path = `${weddingId}/${userId}/quote-${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const uploaded = await supabase.storage.from("wedding-documents").upload(path, file, { contentType: file.type, upsert: false });
    if (uploaded.error) {
      setPending(false);
      setError(uploaded.error.message);
      return;
    }
    const result = await startQuoteIntake(weddingId, { storagePath: path, fileName: file.name, mimeType: file.type });
    setPending(false);
    if (result.error || !result.id || !result.draft) {
      setError(result.error ?? "Le devis n'a pas pu être lu.");
      return;
    }
    setDraft({ ...result.draft, id: result.id });
  }

  return (
    <section className="mt-8 rounded-3xl border border-line bg-paper p-4">
      <h3 className="text-lg font-semibold">Inviter depuis un devis</h3>
      <p className="mt-1 text-sm text-muted">PDF ou image. Rien n&apos;est envoyé tant que vous n&apos;avez pas confirmé. Aucune commission.</p>
      <div className="mt-3">
        <FileDrop
          accept="application/pdf,image/jpeg,image/png,image/webp"
          disabled={pending}
          hint="PDF, JPG, PNG ou WebP · 10 Mo maximum."
          progress={pending ? 50 : null}
          onFiles={(files) => {
            const file = files[0];
            if (file) void onFile(file);
          }}
        />
      </div>
      {error ? <div className="mt-3"><Alert>{error}</Alert></div> : null}
      {draft ? (
        <form action={action} className="mt-4 grid gap-3">
          <input type="hidden" name="intake_id" value={draft.id} />
          <Field label="Nom">
            <TextInput name="business_name" required defaultValue={draft.businessName} />
          </Field>
          <Field label="Métier">
            <SelectInput name="category" defaultValue={draft.category}>
              {VENDOR_CATEGORIES.map((category) => (
                <option key={category} value={category}>{categoryLabel(category)}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="E-mail">
            <TextInput name="email" type="email" required defaultValue={draft.email} />
          </Field>
          <Field label="Téléphone">
            <TextInput name="phone" defaultValue={draft.phone} />
          </Field>
          <Field label="Montant (€)">
            <TextInput name="amount" inputMode="decimal" defaultValue={draft.amountCents ? String(draft.amountCents / 100) : ""} />
          </Field>
          {state.error ? <Alert>{state.error}</Alert> : null}
          {state.success ? <Alert tone="success">{state.success}</Alert> : null}
          <Button type="submit" variant="secondary" disabled={saving} className="w-fit">
            {saving ? "Envoi…" : "Confirmer et inviter"}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
