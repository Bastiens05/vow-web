"use server";

import { revalidatePath } from "next/cache";
import { PROFILE_FIELDS, type ProfileFacts } from "@/lib/domain/profile";
import { messageFromError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { getWeddingSpace } from "@/server/data";
import { requireSession } from "@/server/session";

export async function saveWeddingProfile(weddingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const space = await getWeddingSpace(weddingId);
  if (!(space.role === "couple" || space.actingAsCouple)) return { error: "Réservé aux mariés." };
  const facts: ProfileFacts = {};
  for (const field of PROFILE_FIELDS) {
    facts[field.key] = String(formData.get(field.key) ?? "").trim().slice(0, 2000);
  }
  const supabase = await createClient();
  const { error } = await supabase.from("wedding_profile").upsert({
    wedding_id: weddingId,
    facts,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/pratique`);
  return { success: "Enregistré. Chaque métier ne voit que ce qui le concerne." };
}
