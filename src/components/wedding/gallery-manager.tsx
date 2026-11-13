"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileDrop } from "@/components/ui/file-drop";
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
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const expiry = String(data.get("expires_on") ?? "");
    if (title.length < 2) {
      setError("Donnez un titre à la livraison.");
      return;
    }
    if (!file || file.size === 0) {
      setError("Choisissez un fichier.");
      return;
    }
    const prepared = file.type.startsWith("image/") ? await compressImage(file) : file;
    if (prepared.type.startsWith("image/") && prepared.size > 8 * 1024 * 1024) {
      setError("La photo dépasse 8 Mo après compression. VOW ne garde pas les originaux pleine résolution.");
      return;
    }
    const check = validateUpload(prepared, "delivery");
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setPending(true);
    setProgress(30);
    setError(null);
    const supabase = createClient();
    const path = `${weddingId}/${userId}/${crypto.randomUUID()}-${safeFileName(prepared.name)}`;
    const uploaded = await supabase.storage.from("wedding-gallery").upload(path, prepared, {
      contentType: prepared.type,
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
      file_name: prepared.name.slice(0, 180),
      mime_type: prepared.type || "application/octet-stream",
      size_bytes: prepared.size,
    });
    if (inserted.error) {
      await supabase.from("deliveries").delete().eq("id", delivery.data.id);
      await supabase.storage.from("wedding-gallery").remove([path]);
      setPending(false);
      setError(inserted.error.message);
      return;
    }
    form.reset();
    setFile(null);
    setProgress(100);
    setPending(false);
    router.refresh();
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Déposer les fichiers</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        Les photos sont réduites ici, dans le navigateur (côté le plus long 1 600 px). VOW ne stocke pas les fichiers pleine résolution. Vidéo et PDF restent dans la limite de 50 Mo.
      </p>
      <form onSubmit={onSubmit} className="mt-3 grid gap-3">
        <Field label="Titre">
          <TextInput name="title" required placeholder="Photos finales" />
        </Field>
        <Field label="Disponible jusqu'au">
          <TextInput name="expires_on" type="date" />
        </Field>
        <FileDrop
          accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime,video/webm"
          disabled={pending}
          hint="Photo, vidéo ou PDF · 50 Mo maximum. Les photos s'ouvrent depuis votre pellicule sur téléphone."
          names={file ? [file.name] : []}
          progress={progress}
          onFiles={(files) => setFile(files[0] ?? null)}
        />
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" disabled={pending}>{pending ? "Dépôt…" : "Déposer"}</Button>
      </form>
    </Card>
  );
}

async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const max = 1600;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  bitmap.close();
  if (!blob) return file;
  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
