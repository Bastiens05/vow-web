"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { safeFileName, validateUpload } from "@/lib/domain/uploads";
import { createClient } from "@/lib/supabase/client";

export function GalleryManager({
  weddingId,
  userId,
  vendorId,
}: {
  weddingId: string;
  userId: string;
  vendorId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const expiry = String(data.get("expires_on") ?? "");
    const file = data.get("file");
    if (title.length < 2) {
      setError("Donnez un titre à la livraison.");
      return;
    }
    if (!(file instanceof File) || file.size === 0) {
      setError("Choisissez un fichier.");
      return;
    }
    const check = validateUpload(file, "delivery");
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setPending(true);
    setError(null);
    const supabase = createClient();
    const path = `${weddingId}/${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const uploaded = await supabase.storage.from("wedding-gallery").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploaded.error) {
      setPending(false);
      setError(uploaded.error.message);
      return;
    }
    const delivery = await supabase
      .from("deliveries")
      .insert({
        wedding_id: weddingId,
        vendor_id: vendorId,
        title,
        expires_at: expiry ? `${expiry}T23:59:59.000Z` : null,
      })
      .select("id")
      .single();
    if (delivery.error || !delivery.data) {
      await supabase.storage.from("wedding-gallery").remove([path]);
      setPending(false);
      setError(delivery.error ? delivery.error.message : "La livraison n'a pas pu être créée.");
      return;
    }
    const inserted = await supabase.from("delivery_files").insert({
      delivery_id: delivery.data.id,
      storage_path: path,
      file_name: file.name.slice(0, 180),
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
    });
    if (inserted.error) {
      await supabase.from("deliveries").delete().eq("id", delivery.data.id);
      await supabase.storage.from("wedding-gallery").remove([path]);
      setPending(false);
      setError(inserted.error.message);
      return;
    }
    form.reset();
    setPending(false);
    router.refresh();
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Déposer les fichiers</h2>
      <p className="mt-1 text-sm text-muted">Le couple les télécharge ici. Une date vide laisse le lien ouvert.</p>
      <form onSubmit={onSubmit} className="mt-3 grid gap-3">
        <Field label="Titre">
          <TextInput name="title" required placeholder="Photos finales" />
        </Field>
        <Field label="Disponible jusqu'au">
          <TextInput name="expires_on" type="date" />
        </Field>
        <Field label="Fichier">
          <input name="file" type="file" required className="block w-full text-sm" />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" disabled={pending}>{pending ? "Dépôt…" : "Déposer"}</Button>
      </form>
    </Card>
  );
}
