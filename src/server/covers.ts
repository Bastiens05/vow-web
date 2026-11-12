import { createClient } from "@/lib/supabase/server";

export async function signCovers(rows: { id: string; cover_path: string | null }[]) {
  const supabase = await createClient();
  const urls = new Map<string, string>();
  await Promise.all(
    rows.map(async (row) => {
      if (!row.cover_path) return;
      const signed = await supabase.storage.from("wedding-documents").createSignedUrl(row.cover_path, 60 * 60);
      if (signed.data?.signedUrl) urls.set(row.id, signed.data.signedUrl);
    }),
  );
  return urls;
}
