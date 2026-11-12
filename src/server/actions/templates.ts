"use server";

import { revalidatePath } from "next/cache";
import { builtinTemplate, type TemplateSlot } from "@/lib/domain/timeline-templates";
import { messageFromError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { requireSession } from "@/server/session";

export async function applyTimelineTemplate(weddingId: string, formData: FormData): Promise<void> {
  const session = await requireSession();
  const templateId = String(formData.get("template_id") ?? "");
  const personalId = String(formData.get("personal_id") ?? "");
  const suggestionId = String(formData.get("suggestion_id") ?? "");
  const supabase = await createClient();
  let slots: TemplateSlot[] = [];
  if (suggestionId) {
    const { data } = await supabase.from("timeline_suggestions").select("slots").eq("id", suggestionId).maybeSingle();
    slots = Array.isArray(data?.slots) ? (data.slots as TemplateSlot[]) : [];
  } else if (personalId) {
    const { data } = await supabase.from("timeline_templates").select("slots").eq("id", personalId).maybeSingle();
    slots = Array.isArray(data?.slots) ? (data.slots as TemplateSlot[]) : [];
  } else {
    slots = builtinTemplate(templateId)?.slots ?? [];
  }
  if (slots.length === 0) return;
  const mode = String(formData.get("mode") ?? "");
  const existing = await supabase.from("timeline_slots").select("id", { count: "exact", head: true }).eq("wedding_id", weddingId);
  const already = existing.count ?? 0;
  if (already > 0 && mode !== "add" && mode !== "replace") return;
  if (mode === "replace") {
    const removed = await supabase.from("timeline_slots").delete().eq("wedding_id", weddingId);
    if (removed.error) return;
  }
  const { error } = await supabase.from("timeline_slots").insert(
    slots.map((slot, index) => ({
      wedding_id: weddingId,
      title: slot.title,
      starts_at: slot.startsAt,
      place: slot.place,
      notes: slot.notes,
      sort_order: index + 1,
      created_by: session.userId,
    })),
  );
  if (error) return;
  revalidatePath(`/mariage/${weddingId}/deroulement`);
  revalidatePath(`/mariage/${weddingId}/jour`);
}

export async function suggestTimelineTemplate(weddingId: string, formData: FormData): Promise<void> {
  const session = await requireSession();
  const templateId = String(formData.get("template_id") ?? "");
  const personalId = String(formData.get("personal_id") ?? "");
  const supabase = await createClient();
  let label = "";
  let slots: TemplateSlot[] = [];
  if (personalId) {
    const { data } = await supabase.from("timeline_templates").select("name, slots").eq("id", personalId).maybeSingle();
    label = data?.name ?? "";
    slots = Array.isArray(data?.slots) ? (data.slots as TemplateSlot[]) : [];
  } else {
    const template = builtinTemplate(templateId);
    label = template?.label ?? "";
    slots = template?.slots ?? [];
  }
  if (!label || slots.length === 0) return;
  const { error } = await supabase.from("timeline_suggestions").insert({
    wedding_id: weddingId,
    author_id: session.userId,
    label,
    slots,
  });
  if (error) return;
  revalidatePath(`/mariage/${weddingId}/deroulement`);
}

export async function savePersonalTemplate(weddingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 80) return { error: "Donnez un nom au modèle (2 à 80 caractères)." };
  const supabase = await createClient();
  const { data: slots } = await supabase
    .from("timeline_slots")
    .select("title, starts_at, place, notes")
    .eq("wedding_id", weddingId);
  if (!slots || slots.length === 0) return { error: "Le déroulé est vide." };
  const { error } = await supabase.from("timeline_templates").insert({
    user_id: session.userId,
    name,
    slots: slots.map((slot) => ({
      title: slot.title,
      startsAt: slot.starts_at,
      place: slot.place,
      notes: slot.notes,
    })),
  });
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/deroulement`);
  return { success: "Modèle enregistré." };
}
