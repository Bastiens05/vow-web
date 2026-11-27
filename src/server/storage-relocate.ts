import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

type Move = { id: string; bucket_id: string; from_path: string; to_path: string };

function missingFunction(message: string): boolean {
  const text = message.toLowerCase();
  return text.includes("could not find") || text.includes("pending_storage_relocations") || text.includes("schema cache");
}

async function objectThere(supabase: Client, bucket: string, path: string): Promise<boolean> {
  const probe = await supabase.storage.from(bucket).createSignedUrl(path, 30);
  return !probe.error;
}

/** Moves bytes recorded by relocate_wedding_storage. A missing object does not undo the wedding. */
export async function applyStorageRelocations(supabase: Client): Promise<void> {
  const pending = await supabase.rpc("pending_storage_relocations");
  if (pending.error) {
    if (missingFunction(pending.error.message)) return;
    return;
  }
  for (const row of (pending.data ?? []) as Move[]) {
    const moved = await supabase.storage.from(row.bucket_id).move(row.from_path, row.to_path);
    if (!moved.error) {
      await supabase.rpc("finish_storage_relocation", { p_id: row.id, p_missing: false });
      continue;
    }
    if (await objectThere(supabase, row.bucket_id, row.to_path)) {
      await supabase.rpc("finish_storage_relocation", { p_id: row.id, p_missing: false });
      continue;
    }
    const copied = await supabase.storage.from(row.bucket_id).copy(row.from_path, row.to_path);
    if (!copied.error) {
      await supabase.storage.from(row.bucket_id).remove([row.from_path]);
      await supabase.rpc("finish_storage_relocation", { p_id: row.id, p_missing: false });
      continue;
    }
    if (!(await objectThere(supabase, row.bucket_id, row.from_path))) {
      await supabase.rpc("finish_storage_relocation", { p_id: row.id, p_missing: true });
    }
  }
}
