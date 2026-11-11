"use server";

import { revalidatePath } from "next/cache";
import { callMessage, smsSendingEnabled } from "@/lib/domain/photo-call";
import { isVendorCategory } from "@/lib/domain/categories";
import { messageFromError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { getWeddingSpace } from "@/server/data";
import { requireSession } from "@/server/session";

const CALLERS = new Set(["photographer", "videographer", "planner"]);

export async function callNextGroup(weddingId: string): Promise<ActionState & { message?: string }> {
  const session = await requireSession();
  const space = await getWeddingSpace(weddingId);
  const category = session.vendor?.category;
  const allowed = space.actingAsCouple || space.role === "couple" || (category && isVendorCategory(category) && CALLERS.has(category));
  if (!allowed) return { error: "Réservé au photographe, ou à la personne qu'il délègue." };
  const supabase = await createClient();
  const { data: groups, error } = await supabase
    .from("photo_groups")
    .select("id, title, place, called_at")
    .eq("wedding_id", weddingId)
    .order("sort_order");
  if (error) return { error: messageFromError(error) };
  const next = (groups ?? []).find((group) => !group.called_at);
  if (!next) return { error: "Tous les groupes sont passés." };
  const marked = await supabase.from("photo_groups").update({ called_at: new Date().toISOString() }).eq("id", next.id);
  if (marked.error) return { error: messageFromError(marked.error) };
  const message = callMessage(next.title, next.place ?? "");
  await supabase.rpc("note_couple_change", { p_wedding: weddingId, p_body: message });
  if (smsSendingEnabled()) {
    // No provider is wired. Bastien must approve a paid SMS service before this sends anything.
  }
  revalidatePath(`/mariage/${weddingId}/jour`);
  return { success: "Groupe appelé.", message };
}
