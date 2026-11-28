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

export async function savePracticalJourney(weddingId: string, prev: ActionState, formData: FormData): Promise<ActionState> {
  const saved = await saveWeddingProfile(weddingId, prev, formData);
  if (saved.error) return saved;
  const ceremony = String(formData.get("ceremony_address") ?? "").trim();
  const same = formData.get("same_place") === "on";
  const reception = same ? ceremony : String(formData.get("reception_address") ?? "").trim();
  const supabase = await createClient();
  const { data: existing } = await supabase.from("wedding_practical").select("*").eq("wedding_id", weddingId).maybeSingle();
  const { error } = await supabase.from("wedding_practical").upsert({
    wedding_id: weddingId,
    partner_one_phone: String(formData.get("partner_one_phone") ?? existing?.partner_one_phone ?? ""),
    partner_two_phone: String(formData.get("partner_two_phone") ?? existing?.partner_two_phone ?? ""),
    postal_address: existing?.postal_address ?? "",
    ceremony_address: ceremony,
    reception_address: reception,
    key_contacts: String(formData.get("key_contacts") ?? existing?.key_contacts ?? ""),
    notes: String(formData.get("notes") ?? existing?.notes ?? ""),
  });
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/pratique`);
  revalidatePath(`/mariage/${weddingId}/carte`);
  return saved;
}
