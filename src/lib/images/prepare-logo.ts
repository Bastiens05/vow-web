import { fittedSize, LOGO_MAX_EDGE, PHOTO_MAX_BYTES, safeFileName } from "@/lib/domain/uploads";

export async function prepareLogoFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const size = fittedSize(bitmap.width, bitmap.height, LOGO_MAX_EDGE);
    if (size.width === bitmap.width && size.height === bitmap.height && file.size <= PHOTO_MAX_BYTES) return file;
    const keepAlpha = file.type === "image/png" || file.type === "image/webp";
    const mime = keepAlpha ? "image/webp" : "image/jpeg";
    let blob = await paint(bitmap, size, mime, 0.85);
    if (blob && blob.size > PHOTO_MAX_BYTES) blob = await paint(bitmap, size, mime, 0.6);
    if (!blob) return file;
    const base = safeFileName(file.name.replace(/\.[^.]+$/, "") || "logo");
    const ext = mime === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${base}.${ext}`, { type: mime });
  } finally {
    bitmap.close();
  }
}

function paint(bitmap: ImageBitmap, size: { width: number; height: number }, mime: string, quality: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) return Promise.resolve(null);
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));
}
