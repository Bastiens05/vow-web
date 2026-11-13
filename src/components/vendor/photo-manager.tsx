"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FileDrop } from "@/components/ui/file-drop";
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
  const [names, setNames] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);

  async function onFiles(files: File[]) {
    setError(null);
    setNames(files.map((file) => file.name));
    setPending(true);
    const supabase = createClient();
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      if (!file) continue;
      const check = validateUpload(file, "photo");
      if (!check.ok) {
        setError(check.error);
        continue;
      }
      setProgress(Math.round((index / files.length) * 100));
      const path = `${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const uploaded = await supabase.storage.from("vendor-media").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploaded.error) {
        setError(uploaded.error.message);
        continue;
      }
      const inserted = await supabase.from("vendor_photos").insert({
        vendor_id: vendorId,
        storage_path: path,
      });
      if (inserted.error) {
        await supabase.storage.from("vendor-media").remove([path]);
        setError(inserted.error.message);
      }
    }
    setProgress(100);
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
      <FileDrop
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={pending}
        hint="JPG, PNG ou WebP · 8 Mo maximum. Sur téléphone, le sélecteur ouvre vos photos."
        names={names}
        progress={progress}
        onFiles={(files) => void onFiles(files)}
      />
      {error ? <Alert>{error}</Alert> : null}
    </div>
  );
}
