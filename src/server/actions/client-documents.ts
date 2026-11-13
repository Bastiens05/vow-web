"use server";

import { revalidatePath } from "next/cache";
import { parseOffset } from "@/lib/domain/client-documents";
import { frenchDateToIso } from "@/lib/domain/french-date";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { requireSession } from "@/server/session";

async function ownVendorId() {
  const session = await requireSession();
  if (!session.vendor || session.vendor.user_id !== session.userId) return null;
  return session.vendor.id;
}

function refresh(weddingId?: string) {
  revalidatePath("/reglages");
  if (weddingId) {
    revalidatePath(`/mariage/${weddingId}/documents`);
    revalidatePath(`/mariage/${weddingId}/bulle`);
  }
}

export async function createClientDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const vendorId = await ownVendorId();
  if (!vendorId) return { error: "Réservé au prestataire." };
  const title = String(formData.get("title") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const required = formData.get("required") === "on" || formData.get("required") === "true";
  const offset = parseOffset(String(formData.get("offset_days") ?? ""));
  if (title.length < 1 || title.length > 120) return { error: "Indiquez un intitulé." };
  if (Number.isNaN(offset)) return { error: "L'échéance est un nombre de jours entre -365 et 365, ou vide." };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("vendor_document_templates").select("position").eq("vendor_id", vendorId).order("position", { ascending: false }).limit(1);
  const position = (existing?.[0]?.position ?? -1) + 1;
  const { error } = await supabase.from("vendor_document_templates").insert({
    vendor_id: vendorId,
    title,
    note: note.slice(0, 500),
    required,
    offset_days: offset,
    position,
  });
  if (error) return { error: "Le document n'a pas pu être ajouté." };
  refresh();
  return { success: "Document ajouté à votre liste." };
}

export async function addSuggestedDocument(formData: FormData): Promise<void> {
  await createClientDocument({}, formData);
}

export async function updateClientDocument(formData: FormData): Promise<void> {
  const vendorId = await ownVendorId();
  if (!vendorId) return;
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const required = formData.get("required") === "on" || formData.get("required") === "true";
  const offset = parseOffset(String(formData.get("offset_days") ?? ""));
  if (!id || title.length < 1 || title.length > 120 || Number.isNaN(offset)) return;
  const supabase = await createClient();
  await supabase
    .from("vendor_document_templates")
    .update({ title, note: note.slice(0, 500), required, offset_days: offset })
    .eq("id", id)
    .eq("vendor_id", vendorId);
  refresh();
}

export async function deleteClientDocument(formData: FormData): Promise<void> {
  const vendorId = await ownVendorId();
  if (!vendorId) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("vendor_document_templates").delete().eq("id", id).eq("vendor_id", vendorId);
  refresh();
}

export async function moveClientDocument(formData: FormData): Promise<void> {
  const vendorId = await ownVendorId();
  if (!vendorId) return;
  const id = String(formData.get("id") ?? "");
  const direction = formData.get("direction") === "up" ? -1 : 1;
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendor_document_templates")
    .select("id, position")
    .eq("vendor_id", vendorId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  const rows = data ?? [];
  const index = rows.findIndex((row) => row.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= rows.length) return;
  const reordered = rows.slice();
  const [item] = reordered.splice(index, 1);
  if (!item) return;
  reordered.splice(next, 0, item);
  await Promise.all(
    reordered.map((row, position) =>
      supabase.from("vendor_document_templates").update({ position }).eq("id", row.id).eq("vendor_id", vendorId),
    ),
  );
  refresh();
}

export async function addWeddingDocumentRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.vendor) return { error: "Réservé aux prestataires." };
  const weddingId = String(formData.get("wedding_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const required = formData.get("required") !== "false";
  const dueRaw = String(formData.get("due_on") ?? "").trim();
  const due = dueRaw ? frenchDateToIso(dueRaw) : "";
  if (!weddingId || title.length < 1) return { error: "Indiquez un intitulé." };
  if (dueRaw && !due) return { error: "Indiquez la date au format jj/mm/aaaa." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_wedding_document_request", {
    p_wedding: weddingId,
    p_title: title,
    p_note: note,
    p_required: required,
    p_due: due || null,
  });
  if (error) return { error: "La demande n'a pas pu être ajoutée." };
  refresh(weddingId);
  return { success: "Demande envoyée aux mariés." };
}

export async function submitDocumentRequest(input: {
  requestId: string;
  weddingId: string;
  path: string;
  fileName: string;
}): Promise<ActionState> {
  await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_document_request", {
    p_id: input.requestId,
    p_path: input.path,
    p_name: input.fileName,
  });
  if (error) return { error: "Le document n'a pas pu être envoyé." };
  refresh(input.weddingId);
  return { success: "Document envoyé." };
}

export async function reviewDocumentRequest(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.vendor) return;
  const id = String(formData.get("id") ?? "");
  const weddingId = String(formData.get("wedding_id") ?? "");
  const status = formData.get("status") === "validated" ? "validated" : "correction";
  const note = String(formData.get("note") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.rpc("review_document_request", { p_id: id, p_status: status, p_note: note });
  refresh(weddingId);
}
