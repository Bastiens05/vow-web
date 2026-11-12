"use server";

import { revalidatePath } from "next/cache";
import { messageFromError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { getWeddingSpace } from "@/server/data";
import { requireSession } from "@/server/session";

async function coupleBudget(weddingId: string) {
  await requireSession();
  const space = await getWeddingSpace(weddingId);
  if (!(space.role === "couple" || space.actingAsCouple)) return null;
  return createClient();
}

export async function saveBudgetTotal(weddingId: string, euros: number): Promise<ActionState> {
  const supabase = await coupleBudget(weddingId);
  if (!supabase) return { error: "Réservé aux mariés." };
  if (!Number.isFinite(euros) || euros < 0 || euros > 1_000_000) return { error: "Montant invalide." };
  const { error } = await supabase.from("wedding_budgets").upsert({ wedding_id: weddingId, total_cents: Math.round(euros * 100) });
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/budget`);
  return { success: "Enregistré." };
}

export async function saveBudgetLine(
  weddingId: string,
  line: { id?: string; label: string; euros: number; paid: boolean; vendorUserId?: string | null },
): Promise<ActionState & { id?: string }> {
  const supabase = await coupleBudget(weddingId);
  if (!supabase) return { error: "Réservé aux mariés." };
  const label = line.label.trim().slice(0, 80);
  if (label.length < 1 || !Number.isFinite(line.euros) || line.euros < 0) return { error: "Ligne invalide." };
  const payload = {
    label,
    amount_cents: Math.round(line.euros * 100),
    paid: line.paid,
    vendor_user_id: line.vendorUserId || null,
  };
  if (line.id) {
    const { error } = await supabase.from("budget_lines").update(payload).eq("id", line.id).eq("wedding_id", weddingId);
    if (error) return { error: messageFromError(error) };
    revalidatePath(`/mariage/${weddingId}/budget`);
    return { success: "Enregistré.", id: line.id };
  }
  const { data, error } = await supabase.from("budget_lines").insert({ wedding_id: weddingId, ...payload }).select("id").single();
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/budget`);
  return { success: "Enregistré.", id: data.id };
}

export async function removeBudgetLine(weddingId: string, id: string): Promise<ActionState> {
  const supabase = await coupleBudget(weddingId);
  if (!supabase) return { error: "Réservé aux mariés." };
  const { error } = await supabase.from("budget_lines").delete().eq("id", id).eq("wedding_id", weddingId);
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/budget`);
  return { success: "Retiré." };
}
