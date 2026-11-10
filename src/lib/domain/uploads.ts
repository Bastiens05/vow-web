export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DELIVERY_TYPES = new Set([
  ...PHOTO_TYPES,
  "application/pdf",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);
export const DELIVERY_MAX_BYTES = 50 * 1024 * 1024;
const DOCUMENT_TYPES = new Set([
  ...PHOTO_TYPES,
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function validateUpload(
  file: { size: number; type: string; name: string },
  kind: "photo" | "document" | "delivery",
): { ok: true } | { ok: false; error: string } {
  const allowed = kind === "photo" ? PHOTO_TYPES : kind === "delivery" ? DELIVERY_TYPES : DOCUMENT_TYPES;
  const max = kind === "photo" ? PHOTO_MAX_BYTES : kind === "delivery" ? DELIVERY_MAX_BYTES : DOCUMENT_MAX_BYTES;
  if (!file.name.trim()) return { ok: false, error: "Le fichier n'a pas de nom." };
  if (!allowed.has(file.type)) {
    return {
      ok: false,
      error:
        kind === "photo"
          ? "Formats acceptés : JPG, PNG ou WebP."
          : kind === "delivery"
            ? "Formats acceptés : JPG, PNG, WebP, PDF ou vidéo."
            : "Formats acceptés : PDF, Word, texte, JPG, PNG ou WebP.",
    };
  }
  if (file.size <= 0 || file.size > max) {
    const limit = kind === "photo" ? "8 Mo" : kind === "delivery" ? "50 Mo" : "10 Mo";
    return { ok: false, error: `Le fichier doit faire moins de ${limit}.` };
  }
  return { ok: true };
}

export function safeFileName(name: string): string {
  const base = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return (cleaned || "fichier").slice(0, 80);
}
