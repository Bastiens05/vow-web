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
  revalidatePath(`/mariage/${weddingId}/jour`);
  return { success: "Proposition envoyée au couple." };
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
