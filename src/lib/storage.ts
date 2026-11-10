import { publicSupabaseUrl } from "@/lib/env";

export function publicObjectUrl(bucket: string, path: string): string | null {
  const base = publicSupabaseUrl();
  if (!base) return null;
  const encoded = path.split("/").map((part) => encodeURIComponent(part)).join("/");
  return `${base}/storage/v1/object/public/${bucket}/${encoded}`;
}
