"use server";

import { revalidatePath } from "next/cache";
import type { Json } from "@/lib/database.types";
import { personalShiftNote, type ShiftChange } from "@/lib/domain/shift-note";
import { messageFromError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { sendProductEmail } from "@/server/mail";
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

function readChanges(value: Json | null): ShiftChange[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const raw = value.changes;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.user_id !== "string" || typeof row.title !== "string" || typeof row.new_time !== "string") return [];
    return [{ userId: row.user_id, title: row.title, newTime: row.new_time }];
  });
}

async function fanOut(note: { id: string; weddingId: string; body: string }, authorId: string, changes: ShiftChange[]) {
  const supabase = await createClient();
  const byUser = new Map<string, ShiftChange[]>();
  for (const change of changes) {
    const list = byUser.get(change.userId) ?? [];
    list.push(change);
    byUser.set(change.userId, list);
  }
  if (byUser.size > 0) {
    for (const [userId, rows] of byUser) {
      const body = personalShiftNote(rows);
      await supabase.rpc("notify_shift_personal", { p_wedding: note.weddingId, p_user: userId, p_body: body });
      await notifyWedding([userId], { title: "VOW · Jour J", body, url: `/mariage/${note.weddingId}/jour` });
      const { data: profile } = await supabase.from("profiles").select("email, notify_email").eq("id", userId).maybeSingle();
      if (profile?.notify_email && profile.email) {
        await sendProductEmail({ to: profile.email, subject: "Jour J · vos horaires", text: body });
      }
    }
  } else {
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
  }
  revalidatePath(`/mariage/${note.weddingId}/jour`);
  revalidatePath("/nouveautes");
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
  if (note) await fanOut(note, session.userId, readChanges(data));
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
  revalidatePath("/nouveautes");
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
  if (note) await fanOut(note, session.userId, []);
  return { success: "Les prestataires sont prévenus." };
}

export async function markAlertsRead() {
  const session = await requireSession();
  const supabase = await createClient();
  const { data: notes } = await supabase.from("wedding_notifications").select("id, author_id").limit(80);
  await supabase.rpc("mark_grant_notices_seen");
  await supabase.rpc("mark_admin_notices_seen");
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
