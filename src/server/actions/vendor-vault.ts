"use server";

import { revalidatePath } from "next/cache";
import { frenchDateToIso } from "@/lib/domain/french-date";
import { isVendorVaultCategory } from "@/lib/domain/vendor-vault";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { requireSession } from "@/server/session";

async function ownVendor() {
  const session = await requireSession();
  if (!session.vendor || session.vendor.user_id !== session.userId) return null;
  return session.vendor;
}

function refresh(weddingId?: string) {
  revalidatePath("/reglages");
  if (weddingId) revalidatePath(`/mariage/${weddingId}/documents`);
}

export async function saveVaultFile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const vendor = await ownVendor();
  if (!vendor) return { error: "Réservé au prestataire." };
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "other");
  const path = String(formData.get("storage_path") ?? "");
  const fileName = String(formData.get("file_name") ?? "").trim();
  const mime = String(formData.get("mime_type") ?? "");
  const expiresRaw = String(formData.get("expires_on") ?? "").trim();
  const expires = expiresRaw ? frenchDateToIso(expiresRaw) : "";
  if (expiresRaw && !expires) return { error: "Indiquez l'expiration au format jj/mm/aaaa." };
  const alertDays = Number(formData.get("alert_days") ?? 30);
  const autoShare = formData.get("auto_share") === "on" || formData.get("auto_share") === "true";
  if (title.length < 1 || title.length > 120) return { error: "Indiquez un intitulé." };
  if (!isVendorVaultCategory(category)) return { error: "Catégorie inconnue." };
  if (!path.startsWith(`coffre/${vendor.user_id}/`)) return { error: "Fichier invalide." };
  if (!fileName) return { error: "Le fichier n'a pas de nom." };
  if (!Number.isInteger(alertDays) || alertDays < 1 || alertDays > 180) return { error: "L'alerte est un nombre de jours entre 1 et 180." };
  const supabase = await createClient();
  const { error } = await supabase.from("vendor_vault_files").insert({
    vendor_id: vendor.id,
    title,
    category,
    storage_path: path,
    file_name: fileName.slice(0, 180),
    mime_type: mime.slice(0, 120),
    expires_on: expires || null,
    alert_days: alertDays,
    auto_share: autoShare,
  });
  if (error) return { error: "Le document n'a pas pu être enregistré." };
  refresh();
  return { success: "Document ajouté au coffre-fort." };
}

export async function replaceVaultFile(input: { fileId: string; path: string; fileName: string; mime: string }): Promise<ActionState> {
  const vendor = await ownVendor();
  if (!vendor) return { error: "Réservé au prestataire." };
  if (!input.path.startsWith(`coffre/${vendor.user_id}/`)) return { error: "Fichier invalide." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("replace_vendor_vault_file", {
    p_id: input.fileId,
    p_path: input.path,
    p_name: input.fileName,
    p_mime: input.mime,
  });
  if (error) return { error: "La nouvelle version n'a pas pu être enregistrée." };
  refresh();
  return { success: "Nouvelle version enregistrée." };
}

export async function updateVaultFile(formData: FormData): Promise<void> {
  const vendor = await ownVendor();
  if (!vendor) return;
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "other");
  const expiresRaw = String(formData.get("expires_on") ?? "").trim();
  const expires = expiresRaw ? frenchDateToIso(expiresRaw) : "";
  if (expiresRaw && !expires) return;
  const alertDays = Number(formData.get("alert_days") ?? 30);
  const autoShare = formData.get("auto_share") === "on" || formData.get("auto_share") === "true";
  if (!id || title.length < 1 || !isVendorVaultCategory(category)) return;
  if (!Number.isInteger(alertDays) || alertDays < 1 || alertDays > 180) return;
  const supabase = await createClient();
  await supabase
    .from("vendor_vault_files")
    .update({
      title,
      category,
      expires_on: expires || null,
      alert_days: alertDays,
      auto_share: autoShare,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("vendor_id", vendor.id);
  refresh();
}

export async function shareVaultFiles(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const vendor = await ownVendor();
  if (!vendor) return { error: "Réservé au prestataire." };
  const weddingId = String(formData.get("wedding_id") ?? "");
  const files = formData.getAll("file_id").map(String).filter(Boolean);
  const users = formData.getAll("recipient_id").map(String).filter(Boolean);
  const couple = formData.get("couple") === "on" || formData.get("couple") === "true";
  if (!weddingId || files.length === 0) return { error: "Choisissez au moins un document." };
  if (!couple && users.length === 0) return { error: "Choisissez au moins un destinataire." };
  const supabase = await createClient();
  for (const fileId of files) {
    const { error } = await supabase.rpc("share_vendor_vault", {
      p_file: fileId,
      p_wedding: weddingId,
      p_couple: couple,
      p_users: users,
    });
    if (error) return { error: "Le partage n'a pas abouti." };
  }
  refresh(weddingId);
  revalidatePath(`/mariage/${weddingId}/bulle`);
  return { success: "Documents partagés." };
}
