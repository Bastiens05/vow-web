"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import { buttonClass } from "@/components/ui/button";
import { coverObjectPath } from "@/lib/domain/cover";
import { validateUpload } from "@/lib/domain/uploads";
import { createClient } from "@/lib/supabase/client";
import { setWeddingCover } from "@/server/actions/weddings";

export function CoverPhotoField({ weddingId, userId }: { weddingId: string; userId: string }) {
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
    const extension = file.name.split(".").pop() || "jpg";
    const path = coverObjectPath(weddingId, userId, extension);
    const supabase = createClient();
    const uploaded = await supabase.storage.from("wedding-documents").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploaded.error) {
      setPending(false);
      setError("La photo n'a pas pu être envoyée.");
      return;
    }
    const saved = await setWeddingCover(weddingId, path);
    if (saved.error) {
      await supabase.storage.from("wedding-documents").remove([path]);
      setPending(false);
      setError(saved.error);
      return;
    }
    setPending(false);
    router.refresh();
  }

  return (
    <>
      <label className={buttonClass("sharpGhost", "cursor-pointer")}>
        {pending ? "Envoi…" : "Photo de couverture"}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onChange} disabled={pending} />
      </label>
      {error ? <p className="w-full text-sm text-[var(--vow-on-photo)]">{error}</p> : null}
    </>
  );
}
