import type { SupabaseClient } from "@supabase/supabase-js";
import { groupStoragePaths } from "@/lib/domain/account-files";
import type { Database } from "@/lib/database.types";
import { messageFromError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

type Client = SupabaseClient<Database>;

export async function deleteSignedInAccount(confirm: string): Promise<{ error: string } | { ok: true }> {
  if (confirm.trim() !== "SUPPRIMER") {
    return { error: "Écrivez SUPPRIMER pour confirmer." };
  }
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (userError || !userId) return { error: "Authentification requise." };

  const listed = await supabase.rpc("my_account_files");
  if (listed.error) {
    const message = listed.error.message.toLowerCase();
    if (message.includes("could not find") || message.includes("my_account_files")) {
      return { error: "La suppression de compte n'est pas encore ouverte." };
    }
    return { error: messageFromError(listed.error) };
  }
  const ready = await supabase.rpc("account_deletion_ready");
  if (ready.error) {
    const message = ready.error.message.toLowerCase();
    if (message.includes("could not find") || message.includes("account_deletion_ready")) {
      return { error: "La suppression de compte n'est pas encore ouverte." };
    }
    return { error: messageFromError(ready.error) };
  }
  const files = [...(listed.data ?? []), ...(await listOwnStorageFolders(supabase, userId))];
  const removed = await removeAccountFiles(supabase, files);
  if (removed) return { error: removed };
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: "Les fichiers sont retirés, mais le compte n'a pas pu être fermé. Réessayez." };
  await supabase.auth.signOut();
  return { ok: true };
}

async function listOwnStorageFolders(supabase: Client, userId: string): Promise<{ bucket: string; path: string }[]> {
  const { data: memberships } = await supabase.from("wedding_members").select("wedding_id").eq("user_id", userId);
  const prefixes: { bucket: string; prefix: string }[] = [
    { bucket: "vendor-media", prefix: userId },
    { bucket: "wedding-documents", prefix: `coffre/${userId}` },
  ];
  for (const membership of memberships ?? []) {
    prefixes.push({ bucket: "wedding-documents", prefix: `${membership.wedding_id}/${userId}` });
    prefixes.push({ bucket: "wedding-gallery", prefix: `${membership.wedding_id}/${userId}` });
  }
  const files: { bucket: string; path: string }[] = [];
  for (const item of prefixes) {
    const { data, error } = await supabase.storage.from(item.bucket).list(item.prefix, { limit: 1000 });
    if (error || !data) continue;
    for (const entry of data) {
      if (!entry.id || !entry.name) continue;
      files.push({ bucket: item.bucket, path: `${item.prefix}/${entry.name}` });
    }
  }
  return files;
}

async function removeAccountFiles(supabase: Client, files: { bucket: string; path: string }[]): Promise<string | null> {
  const grouped = groupStoragePaths(files);
  for (const [bucket, paths] of grouped) {
    for (let index = 0; index < paths.length; index += 100) {
      const chunk = paths.slice(index, index + 100);
      const { error } = await supabase.storage.from(bucket).remove(chunk);
      if (!error) continue;
      return "Les fichiers n'ont pas pu être retirés. Le compte n'a pas été supprimé.";
    }
  }
  return null;
}
