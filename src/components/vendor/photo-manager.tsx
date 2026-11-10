"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { safeFileName, validateUpload } from "@/lib/domain/uploads";
import { publicObjectUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { deletePhoto } from "@/server/actions/vendor";

export function PhotoManager({
  vendorId,
  userId,
  photos,
}: {
  vendorId: string;
  userId: string;
  photos: { id: string; storage_path: string; caption: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const check = validateUpload(file, "photo");
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setPending(true);
    setError(null);
    const supabase = createClient();
    const path = `${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const uploaded = await supabase.storage.from("vendor-media").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploaded.error) {
      setPending(false);
      setError(uploaded.error.message);
      return;
    }
    const inserted = await supabase.from("vendor_photos").insert({
      vendor_id: vendorId,
      storage_path: path,
    });
    if (inserted.error) {
      await supabase.storage.from("vendor-media").remove([path]);
      setPending(false);
      setError(inserted.error.message);
      return;
    }
    setPending(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo) => {
          const src = publicObjectUrl("vendor-media", photo.storage_path);
          return (
            <figure key={photo.id} className="overflow-hidden rounded-xl border border-line bg-ivory">
              {src ? (
                <div className="relative aspect-[4/3]">
                  <Image src={src} alt={photo.caption || "Photo de la vitrine"} fill unoptimized className="object-cover" sizes="240px" />
                </div>
              ) : null}
              <form action={deletePhoto} className="p-2">
                <input type="hidden" name="id" value={photo.id} />
                <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">
                  Retirer
                </Button>
              </form>
            </figure>
          );
        })}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-3 text-sm">
        <input type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" onChange={onChange} disabled={pending} />
        {pending ? <span className="text-muted">Envoi…</span> : null}
      </label>
      {error ? <Alert>{error}</Alert> : null}
    </div>
  );
}
