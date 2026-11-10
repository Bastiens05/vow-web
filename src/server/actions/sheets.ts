"use server";

import { revalidatePath } from "next/cache";
import { messageFromError } from "@/lib/errors";
import { validateGuest, validatePhotoGroup, validatePractical } from "@/lib/domain/sheets";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { requireSession } from "@/server/session";

function path(weddingId: string) {
  return `/mariage/${weddingId}/pratique`;
}

export async function savePractical(weddingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = validatePractical({
    partnerOnePhone: String(formData.get("partner_one_phone") ?? ""),
    partnerTwoPhone: String(formData.get("partner_two_phone") ?? ""),
    postalAddress: String(formData.get("postal_address") ?? ""),
    ceremonyAddress: String(formData.get("ceremony_address") ?? ""),
    receptionAddress: String(formData.get("reception_address") ?? ""),
    keyContacts: String(formData.get("key_contacts") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!parsed.ok) return { error: parsed.error };
  const supabase = await createClient();
  const payload = {
    wedding_id: weddingId,
    partner_one_phone: parsed.value.partnerOnePhone,
    partner_two_phone: parsed.value.partnerTwoPhone,
    postal_address: parsed.value.postalAddress,
    ceremony_address: parsed.value.ceremonyAddress,
    reception_address: parsed.value.receptionAddress,
    key_contacts: parsed.value.keyContacts,
    notes: parsed.value.notes,
  };
  const { error } = await supabase.from("wedding_practical").upsert(payload);
  if (error) return { error: messageFromError(error) };
  revalidatePath(path(weddingId));
  revalidatePath("/espace");
  return { success: "Infos enregistrées." };
}

export async function addPhotoGroup(weddingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = validatePhotoGroup({
    title: String(formData.get("title") ?? ""),
    people: String(formData.get("people") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!parsed.ok) return { error: parsed.error };
  const supabase = await createClient();
  const { count } = await supabase
    .from("photo_groups")
    .select("id", { count: "exact", head: true })
    .eq("wedding_id", weddingId);
  const { error } = await supabase.from("photo_groups").insert({
    wedding_id: weddingId,
    title: parsed.value.title,
    people: parsed.value.people,
    notes: parsed.value.notes,
    sort_order: count ?? 0,
  });
  if (error) return { error: messageFromError(error) };
  revalidatePath(path(weddingId));
  return { success: "Groupe ajouté." };
}

export async function deletePhotoGroup(formData: FormData) {
  await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("photo_groups").delete().eq("id", id).eq("wedding_id", weddingId);
  revalidatePath(path(weddingId));
}

export async function addGuest(weddingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = validateGuest({
    fullName: String(formData.get("full_name") ?? ""),
    tableLabel: String(formData.get("table_label") ?? ""),
    dietary: String(formData.get("dietary") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!parsed.ok) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase.from("guests").insert({
    wedding_id: weddingId,
    full_name: parsed.value.fullName,
    table_label: parsed.value.tableLabel,
    dietary: parsed.value.dietary,
    notes: parsed.value.notes,
  });
  if (error) return { error: messageFromError(error) };
  revalidatePath(path(weddingId));
  return {};
}

export async function deleteGuest(formData: FormData) {
  await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("guests").delete().eq("id", id).eq("wedding_id", weddingId);
  revalidatePath(path(weddingId));
}
