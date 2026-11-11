"use server";

import { revalidatePath } from "next/cache";
import { messageFromError } from "@/lib/errors";
import { validateComment, validateMessage, validateTimelineSlot } from "@/lib/domain/validation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { requireSession } from "@/server/session";

export async function sendMessage(
  weddingId: string,
  vendorUserId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const parsed = validateMessage(String(formData.get("body") ?? ""));
  if (!parsed.ok) return { error: parsed.error };
  if (!vendorUserId) return { error: "Choisissez un prestataire." };
  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    wedding_id: weddingId,
    author_id: session.userId,
    vendor_user_id: vendorUserId,
    body: parsed.value,
  });
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/messages`);
  return {};
}

export async function deleteDocument(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  const weddingId = String(formData.get("wedding_id") ?? "");
  const supabase = await createClient();
  const { data: document } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
  if (!document || document.wedding_id !== weddingId) return;
  const isOwner = document.uploaded_by === session.userId;
  if (!isOwner && session.profile.role !== "vendor") return;
  await supabase.storage.from("wedding-documents").remove([document.storage_path]);
  await supabase.from("documents").delete().eq("id", document.id);
  revalidatePath(`/mariage/${weddingId}/documents`);
}

export async function addTimelineSlot(
  weddingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const parsed = validateTimelineSlot({
    title: String(formData.get("title") ?? ""),
    startsAt: String(formData.get("starts_at") ?? ""),
    place: String(formData.get("place") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!parsed.ok) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase.from("timeline_slots").insert({
    wedding_id: weddingId,
    title: parsed.value.title,
    starts_at: parsed.value.startsAt,
    place: parsed.value.place,
    notes: parsed.value.notes,
    created_by: session.userId,
  });
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/deroulement`);
  revalidatePath(`/mariage/${weddingId}/jour`);
  return { success: "Moment ajouté." };
}

export async function updateTimelineSlot(
  weddingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const parsed = validateTimelineSlot({
    title: String(formData.get("title") ?? ""),
    startsAt: String(formData.get("starts_at") ?? ""),
    place: String(formData.get("place") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!parsed.ok) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from("timeline_slots")
    .update({
      title: parsed.value.title,
      starts_at: parsed.value.startsAt,
      place: parsed.value.place,
      notes: parsed.value.notes,
    })
    .eq("id", id)
    .eq("wedding_id", weddingId);
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/deroulement`);
  revalidatePath(`/mariage/${weddingId}/jour`);
  return { success: "Moment mis à jour." };
}

export async function deleteTimelineSlot(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const weddingId = String(formData.get("wedding_id") ?? "");
  const supabase = await createClient();
  await supabase.from("timeline_slots").delete().eq("id", id).eq("wedding_id", weddingId);
  revalidatePath(`/mariage/${weddingId}/deroulement`);
  revalidatePath(`/mariage/${weddingId}/jour`);
}

export async function addTimelineComment(
  weddingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const slotId = String(formData.get("slot_id") ?? "");
  const parsed = validateComment(String(formData.get("body") ?? ""));
  if (!parsed.ok) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase.from("timeline_comments").insert({
    slot_id: slotId,
    author_id: session.userId,
    body: parsed.value,
  });
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/deroulement`);
  return {};
}
