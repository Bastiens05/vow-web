"use server";

import { revalidatePath } from "next/cache";
import { factsFromJson, missingQuestions } from "@/lib/domain/profile";
import { questionTemplate } from "@/lib/domain/questions";
import { isVendorCategory } from "@/lib/domain/categories";
import { messageFromError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { requireSession } from "@/server/session";

export async function applyQuestionTemplate(weddingId: string, formData: FormData): Promise<void> {
  if (String(formData.get("wedding_id") ?? "") !== weddingId) return;
  const session = await requireSession();
  if (!session.vendor || !isVendorCategory(session.vendor.category)) return;
  const supabase = await createClient();
  const { data: slice } = await supabase.rpc("my_profile_slice", { p_wedding: weddingId });
  const prompts = missingQuestions(questionTemplate(session.vendor.category), factsFromJson(slice))
    .filter((row) => !row.known)
    .map((row) => row.prompt);
  if (prompts.length === 0) return;
  const { data: created, error } = await supabase
    .from("questionnaires")
    .insert({
      wedding_id: weddingId,
      vendor_id: session.vendor.id,
      title: "Avant le mariage",
    })
    .select("id")
    .single();
  if (error || !created) return;
  await supabase.from("questionnaire_items").insert(
    prompts.map((prompt, index) => ({
      questionnaire_id: created.id,
      prompt,
      sort_order: index + 1,
    })),
  );
  revalidatePath(`/mariage/${weddingId}/questions`);
}

export async function sendQuestionnaire(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const weddingId = String(formData.get("wedding_id") ?? "");
  const supabase = await createClient();
  await supabase.from("questionnaires").update({ status: "sent" }).eq("id", id).eq("status", "draft");
  revalidatePath(`/mariage/${weddingId}/questions`);
}

export async function saveAnswers(weddingId: string, questionnaireId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const supabase = await createClient();
  const { data: items } = await supabase.from("questionnaire_items").select("id").eq("questionnaire_id", questionnaireId);
  for (const item of items ?? []) {
    const answer = String(formData.get(item.id) ?? "").trim().slice(0, 2000);
    const { error } = await supabase.from("questionnaire_items").update({ answer }).eq("id", item.id);
    if (error) return { error: messageFromError(error) };
  }
  const { error } = await supabase.from("questionnaires").update({ status: "answered" }).eq("id", questionnaireId);
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/questions`);
  return { success: "Réponses enregistrées." };
}

export async function addStop(weddingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const label = String(formData.get("label") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const time = String(formData.get("starts_at") ?? "").trim();
  if (label.length < 2) return { error: "Donnez un nom au lieu." };
  if (address.length < 4) return { error: "Indiquez l'adresse." };
  const supabase = await createClient();
  const { count } = await supabase.from("wedding_stops").select("id", { count: "exact", head: true }).eq("wedding_id", weddingId);
  const { error } = await supabase.from("wedding_stops").insert({
    wedding_id: weddingId,
    label,
    address,
    starts_at: time || null,
    sort_order: (count ?? 0) + 1,
  });
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/carte`);
  return { success: "Lieu ajouté." };
}

export async function saveSharePrefs(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.vendor) return { error: "Réservé aux prestataires." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("vendor_profiles")
    .update({
      share_phone: formData.get("share_phone") === "on",
      share_email: formData.get("share_email") === "on",
    })
    .eq("id", session.vendor.id);
  if (error) return { error: messageFromError(error) };
  revalidatePath("/reglages");
  revalidatePath("/mariage", "layout");
  return { success: "Visibilité enregistrée." };
}
