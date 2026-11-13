"use server";

import { revalidatePath } from "next/cache";
import { messagesToMarkRead, type ThreadMessage } from "@/lib/domain/message-reads";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/server/session";

export async function markThreadRead(weddingId: string, vendorUserId: string): Promise<boolean> {
  const session = await requireSession();
  if (!weddingId || !vendorUserId) return false;
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("messages")
    .select("id, author_id, vendor_user_id")
    .eq("wedding_id", weddingId)
    .eq("vendor_user_id", vendorUserId);
  if (error || !rows?.length) return false;
  const messages: ThreadMessage[] = rows.map((row) => ({
    id: row.id,
    authorId: row.author_id,
    vendorUserId: row.vendor_user_id,
  }));
  const ids = messages.map((message) => message.id);
  const { data: existing, error: readError } = await supabase.from("message_reads").select("message_id").in("message_id", ids);
  if (readError) return false;
  const already = new Set((existing ?? []).map((row) => row.message_id));
  const fresh = messagesToMarkRead(messages, session.userId, already);
  let changed = false;
  if (fresh.length > 0) {
    const inserted = await supabase.from("message_reads").insert(fresh.map((id) => ({ message_id: id, user_id: session.userId })));
    if (inserted.error) return false;
    changed = true;
  }
  const others = messagesToMarkRead(messages, session.userId, new Set());
  if (others.length > 0) {
    const { data: notes } = await supabase
      .from("wedding_notifications")
      .select("id, message_id")
      .eq("wedding_id", weddingId)
      .in("message_id", others);
    const linked = (notes ?? []).flatMap((note) => (note.message_id ? [note.id] : []));
    if (linked.length > 0) {
      const { data: seen } = await supabase.from("notification_reads").select("notification_id").in("notification_id", linked);
      const seenIds = new Set((seen ?? []).map((row) => row.notification_id));
      const unreadNotes = linked.filter((id) => !seenIds.has(id));
      if (unreadNotes.length > 0) {
        const noted = await supabase.from("notification_reads").upsert(
          unreadNotes.map((id) => ({ notification_id: id, user_id: session.userId })),
          { onConflict: "notification_id,user_id", ignoreDuplicates: true },
        );
        if (!noted.error) changed = true;
      }
    }
  }
  if (!changed) return false;
  revalidatePath(`/mariage/${weddingId}/messages`);
  revalidatePath("/messages");
  revalidatePath("/espace");
  revalidatePath("/", "layout");
  return true;
}
