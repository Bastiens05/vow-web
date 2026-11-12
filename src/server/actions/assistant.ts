"use server";

import { revalidatePath } from "next/cache";
import { parseProgrammeSlots, splitBudget } from "@/lib/domain/assistant";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace } from "@/server/data";
import { requireSession } from "@/server/session";

function confirmed(formData: FormData): boolean {
  return formData.get("confirm") === "yes";
}

export async function applyProposedProgramme(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!confirmed(formData)) return;
  const weddingId = String(formData.get("wedding_id") ?? "");
  const space = await getWeddingSpace(weddingId);
  if (!(space.role === "couple" || space.actingAsCouple)) return;
  let slots = null;
  try {
    slots = parseProgrammeSlots(JSON.parse(String(formData.get("slots") ?? "null")));
  } catch {
    return;
  }
  if (!slots) return;
  const mode = String(formData.get("mode") ?? "");
  const supabase = await createClient();
  const existing = await supabase.from("timeline_slots").select("id", { count: "exact", head: true }).eq("wedding_id", weddingId);
  const already = existing.count ?? 0;
  if (already > 0 && mode !== "add" && mode !== "replace") return;
  if (mode === "replace" || already === 0) {
    if (already > 0) {
      const removed = await supabase.from("timeline_slots").delete().eq("wedding_id", weddingId);
      if (removed.error) return;
    }
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
  revalidatePath(`/mariage/${weddingId}/jour`);
  revalidatePath("/espace");
}

export async function applyBudgetSplit(formData: FormData): Promise<void> {
  await requireSession();
  if (!confirmed(formData)) return;
  const weddingId = String(formData.get("wedding_id") ?? "");
  const space = await getWeddingSpace(weddingId);
  if (!(space.role === "couple" || space.actingAsCouple)) return;
  const total = Number(formData.get("total_cents"));
  if (!Number.isFinite(total) || total <= 0) return;
  const lines = splitBudget(total);
  const supabase = await createClient();
  const saved = await supabase.from("wedding_budgets").upsert({ wedding_id: weddingId, total_cents: Math.round(total) });
  if (saved.error) return;
  await supabase.from("budget_lines").delete().eq("wedding_id", weddingId);
  await supabase.from("budget_lines").insert(
    lines.map((line, index) => ({
      wedding_id: weddingId,
      label: line.label,
      amount_cents: line.cents,
      sort_order: index + 1,
    })),
  );
  revalidatePath(`/mariage/${weddingId}/budget`);
}

export async function applySuggestedChecklist(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!confirmed(formData) || !session.vendor) return;
  const weddingId = String(formData.get("wedding_id") ?? "");
  const space = await getWeddingSpace(weddingId);
  if (space.role === "couple" || space.actingAsCouple) return;
  const prompts = String(formData.get("prompts") ?? "")
    .split("\n")
    .map((prompt) => prompt.trim())
    .filter((prompt) => prompt.length >= 8 && prompt.length <= 160)
    .slice(0, 8);
  if (prompts.length === 0) return;
  const supabase = await createClient();
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
