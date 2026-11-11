"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { requireSession } from "@/server/session";

export async function addVaultItem(weddingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const kind = String(formData.get("kind") ?? "custom").slice(0, 40);
  const label = String(formData.get("label") ?? "").trim().slice(0, 120);
  const storagePath = String(formData.get("storage_path") ?? "");
  const fileName = String(formData.get("file_name") ?? "").slice(0, 180);
  const mime = String(formData.get("mime_type") ?? "").slice(0, 120);
  if (label.length < 2) return { error: "Indiquez un nom." };
  if (!storagePath.startsWith(`${weddingId}/`)) return { error: "Fichier invalide." };
  const supabase = await createClient();
  const { error } = await supabase.from("vault_items").insert({
    wedding_id: weddingId,
    owner_id: session.userId,
    kind,
    label,
    storage_path: storagePath,
    file_name: fileName,
    mime_type: mime,
  });
  if (error) return { error: "Le coffre n'est pas encore disponible." };
  revalidatePath(`/mariage/${weddingId}/coffre`);
  return { success: "Document ajouté au coffre." };
}

export async function shareVaultItem(weddingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const itemId = String(formData.get("item_id") ?? "");
  const vendorUserId = String(formData.get("vendor_user_id") ?? "");
  if (!itemId || !vendorUserId) return { error: "Partage incomplet." };
  const supabase = await createClient();
  const { error } = await supabase.from("vault_shares").insert({ item_id: itemId, vendor_user_id: vendorUserId });
  if (error) return { error: "Le partage n'a pas abouti." };
  revalidatePath(`/mariage/${weddingId}/bulle/${vendorUserId}`);
  return { success: "Partagé avec ce prestataire." };
}
