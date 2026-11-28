"use server";

import { revalidatePath } from "next/cache";
import { parseTemplateSlots } from "@/lib/domain/timeline-templates";
import { validateTimelineSlot } from "@/lib/domain/validation";
import { messageFromError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { getWeddingSpace } from "@/server/data";
import { requireSession } from "@/server/session";

export async function proposeCoupleSession(
  weddingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  if (session.vendor?.category !== "photographer" || session.vendor.user_id !== session.userId) {
    return { error: "Réservé au photographe de ce mariage." };
  }
  const parsed = validateTimelineSlot({
    title: "Séance couple",
    startsAt: String(formData.get("starts_at") ?? ""),
    place: String(formData.get("place") ?? ""),
    notes: "",
  });
  if (!parsed.ok) return { error: parsed.error };
  if (parsed.value.place.length < 2) return { error: "Indiquez le lieu." };
  const supabase = await createClient();
  const { error } = await supabase.from("timeline_suggestions").insert({
    wedding_id: weddingId,
    author_id: session.userId,
    label: "Séance couple",
    slots: [{ title: "Séance couple", startsAt: parsed.value.startsAt, place: parsed.value.place, notes: "" }],
  });
  if (error) return { error: messageFromError(error) };
  await supabase.rpc("notify_couple_session", {
    p_wedding: weddingId,
    p_body: `Séance couple proposée à ${parsed.value.startsAt}, ${parsed.value.place}.`,
  });
  revalidatePath(`/mariage/${weddingId}/jour`);
  revalidatePath("/nouveautes");
  return { success: "Proposition envoyée au couple." };
}

export async function answerCoupleCounter(
  weddingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  if (session.vendor?.category !== "photographer" || session.vendor.user_id !== session.userId) {
    return { error: "Réservé au photographe de ce mariage." };
  }
  await getWeddingSpace(weddingId);
  const choice = String(formData.get("choice") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("answer_couple_counter", {
    p_suggestion: String(formData.get("suggestion_id") ?? ""),
    p_choice: choice,
  });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("could not find") || message.includes("answer_couple_counter")) {
      return { error: "La réponse du photographe n'est pas encore ouverte." };
    }
    return { error: messageFromError(error) };
  }
  revalidatePath(`/mariage/${weddingId}/jour`);
  revalidatePath(`/mariage/${weddingId}/deroulement`);
  return { success: choice === "accept" ? "Séance ajoutée au planning." : "Autre heure refusée." };
}

export async function composeNamedGroup(
  weddingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  if (session.vendor?.category !== "photographer" || session.vendor.user_id !== session.userId) {
    return { error: "Réservé au photographe de ce mariage." };
  }
  const names = formData.getAll("name").map(String).map((name) => name.trim()).filter(Boolean);
  if (names.length === 0) return { error: "Choisissez au moins un invité." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("compose_named_photo_group", {
    p_wedding: weddingId,
    p_title: String(formData.get("title") ?? "").trim(),
    p_names: names,
  });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("could not find") || message.includes("compose_named_photo_group")) {
      return { error: "La composition n'est pas encore ouverte." };
    }
    return { error: messageFromError(error) };
  }
  revalidatePath(`/mariage/${weddingId}/jour`);
  revalidatePath(`/mariage/${weddingId}/documents`);
  return { success: "Groupe enregistré." };
}

export async function respondCoupleSession(
  weddingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const space = await getWeddingSpace(weddingId);
  if (!(space.role === "couple" || space.actingAsCouple)) {
    return { error: "Seul le couple répond à la séance." };
  }
  const choice = String(formData.get("choice") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_couple_session", {
    p_suggestion: String(formData.get("suggestion_id") ?? ""),
    p_choice: choice,
    p_time: String(formData.get("starts_at") ?? ""),
    p_place: String(formData.get("place") ?? ""),
  });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("could not find") || message.includes("respond_couple_session")) {
      return { error: "La réponse n'est pas encore ouverte." };
    }
    return { error: messageFromError(error) };
  }
  revalidatePath(`/mariage/${weddingId}/jour`);
  revalidatePath("/nouveautes");
  return { success: choice === "refuse" ? "Proposition refusée." : "Autre heure proposée." };
}

export async function acceptCoupleSession(
  weddingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const space = await getWeddingSpace(weddingId);
  if (!(space.role === "couple" || space.actingAsCouple)) {
    return { error: "Seul le couple ajoute une étape au planning." };
  }
  const suggestionId = String(formData.get("suggestion_id") ?? "");
  const supabase = await createClient();
  const { data } = await supabase
    .from("timeline_suggestions")
    .select("slots")
    .eq("id", suggestionId)
    .eq("wedding_id", weddingId)
    .eq("label", "Séance couple")
    .maybeSingle();
  const slot = parseTemplateSlots(data?.slots).find((item) => item.title === "Séance couple");
  if (!slot) return { error: "Cette proposition n'est plus là." };
  const { error } = await supabase.from("timeline_slots").insert({
    wedding_id: weddingId,
    title: slot.title,
    starts_at: slot.startsAt,
    place: slot.place,
    notes: slot.notes,
    created_by: space.session.userId,
  });
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/deroulement`);
  revalidatePath(`/mariage/${weddingId}/jour`);
  return { success: "Séance ajoutée au planning." };
}
