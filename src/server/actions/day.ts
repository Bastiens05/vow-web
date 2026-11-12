"use server";

import { revalidatePath } from "next/cache";
import type { Json } from "@/lib/database.types";
import { messageFromError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { sendMemberMail } from "@/server/product-mail";
import { notifyWedding } from "@/server/push";
import { requireSession } from "@/server/session";

function readNote(value: Json | null): { id: string; weddingId: string; body: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (typeof value.notification_id !== "string" || typeof value.wedding_id !== "string" || typeof value.body !== "string") {
    return null;
  }
  return { id: value.notification_id, weddingId: value.wedding_id, body: value.body };
}

async function fanOut(note: { id: string; weddingId: string; body: string }, authorId: string) {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("wedding_members")
    .select("user_id")
    .eq("wedding_id", note.weddingId)
    .neq("user_id", authorId);
  const ids = (members ?? []).map((member) => member.user_id);
  await notifyWedding(ids, {
    title: "VOW · Jour J",
    body: note.body,
    url: `/mariage/${note.weddingId}/jour`,
  });
  await sendMemberMail(supabase, note.weddingId, authorId, {
    subject: "Jour J · un horaire a changé",
    heading: "Le jour J bouge",
    body: note.body,
    buttonLabel: "Voir le jour J",
    path: `/mariage/${note.weddingId}/jour`,
  });
  revalidatePath(`/mariage/${note.weddingId}/jour`);
  revalidatePath("/alertes");
}

export async function shiftSlot(
  weddingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { notificationId?: string }> {
  const session = await requireSession();
  const slotId = String(formData.get("slot_id") ?? "");
  const newTime = String(formData.get("new_time") ?? "");
  if (!/^\d{2}:\d{2}$/.test(newTime)) return { error: "Heure invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("shift_timeline_slot", {
    p_slot_id: slotId,
    p_new_time: newTime,
    p_cascade: formData.get("cascade") === "on",
  });
  if (error) return { error: messageFromError(error) };
  const note = readNote(data);
  if (note) await fanOut(note, session.userId);
  revalidatePath(`/mariage/${weddingId}/deroulement`);
  revalidatePath(`/mariage/${weddingId}/jour`);
  return {
    success: note?.body ?? "Horaire mis à jour.",
    notificationId: note?.id,
  };
}

export async function undoShift(input: {
  weddingId: string;
  slotId: string;
  previousTime: string;
  notificationId: string;
  cascade: boolean;
  minutes: number;
}): Promise<ActionState> {
  await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.rpc("undo_timeline_shift", {
    p_slot_id: input.slotId,
    p_previous_time: input.previousTime,
    p_notification_id: input.notificationId,
    p_cascade: input.cascade,
    p_minutes: input.minutes,
  });
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${input.weddingId}/jour`);
  revalidatePath("/alertes");
  return { success: "Décalage annulé." };
}

export async function sendDayAlert(weddingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const message = String(formData.get("message") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("post_wedding_alert", {
    p_wedding_id: weddingId,
    p_message: message,
  });
  if (error) return { error: messageFromError(error) };
  const note = readNote(data);
  if (note) await fanOut(note, session.userId);
  return { success: "Les prestataires sont prévenus." };
}

export async function markAlertsRead() {
  const session = await requireSession();
  const supabase = await createClient();
  const { data: notes } = await supabase.from("wedding_notifications").select("id, author_id").limit(80);
  const unread = (notes ?? []).filter((note) => note.author_id !== session.userId);
  if (unread.length === 0) return;
  await supabase.from("notification_reads").upsert(
    unread.map((note) => ({ notification_id: note.id, user_id: session.userId })),
    { onConflict: "notification_id,user_id", ignoreDuplicates: true },
  );
}

export async function savePushSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: session.userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth_secret: subscription.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) return { error: messageFromError(error) };
  return { success: "Les nouveautés arriveront sur cet appareil." };
}
