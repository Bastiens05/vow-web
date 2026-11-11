"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { messageFromError } from "@/lib/errors";
import { safeFileName } from "@/lib/domain/uploads";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { sendCoupleMail } from "@/server/product-mail";
import { requireSession } from "@/server/session";

export async function requestSignature(formData: FormData): Promise<void> {
  const session = await requireSession();
  const documentId = String(formData.get("document_id") ?? "");
  const weddingId = String(formData.get("wedding_id") ?? "");
  const supabase = await createClient();
  const { data: document } = await supabase.from("documents").select("*").eq("id", documentId).maybeSingle();
  if (!document || document.wedding_id !== weddingId) return;
  if (document.mime_type !== "application/pdf") return;
  const file = await supabase.storage.from("wedding-documents").download(document.storage_path);
  if (file.error || !file.data) return;
  const bytes = Buffer.from(await file.data.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  await supabase.from("signature_requests").insert({
    document_id: document.id,
    wedding_id: weddingId,
    requested_by: session.userId,
    document_sha256: sha256,
  });
  await sendCoupleMail(supabase, weddingId, {
    subject: `Contrat à signer · ${document.file_name}`,
    heading: "Un contrat à signer",
    body: `${document.file_name} attend votre signature dans le mariage.`,
    buttonLabel: "Ouvrir le document",
    path: `/mariage/${weddingId}/documents`,
  });
  revalidatePath(`/mariage/${weddingId}/documents`);
}

export async function signDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (formData.get("consent") !== "on") {
    return { error: "Cochez le consentement pour signer." };
  }
  const requestId = String(formData.get("request_id") ?? "");
  const weddingId = String(formData.get("wedding_id") ?? "");
  const name = String(formData.get("signer_name") ?? "").trim();
  const file = formData.get("signature");
  if (!(file instanceof File) || file.size < 80) {
    return { error: "Tracez votre signature." };
  }
  const supabase = await createClient();
  const path = `${weddingId}/${session.userId}/signature-${requestId}-${safeFileName(file.name || "signature.png")}`;
  const uploaded = await supabase.storage.from("wedding-documents").upload(path, file, {
    contentType: "image/png",
    upsert: true,
  });
  if (uploaded.error) return { error: messageFromError(uploaded.error) };

  const headerStore = await headers();
  const ip = (headerStore.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ?? "";
  const { error } = await supabase.rpc("record_signature", {
    p_request_id: requestId,
    p_name: name,
    p_path: path,
    p_ip: ip,
    p_user_agent: headerStore.get("user-agent") ?? "",
  });
  if (error) {
    await supabase.storage.from("wedding-documents").remove([path]);
    return { error: messageFromError(error) };
  }
  await supabase.from("vault_items").insert({
    wedding_id: weddingId,
    owner_id: session.userId,
    kind: "contract",
    label: "Contrat signé",
    storage_path: path,
    file_name: "signature.png",
    mime_type: "image/png",
  });
  revalidatePath(`/mariage/${weddingId}/documents`);
  revalidatePath(`/mariage/${weddingId}/coffre`);
  return { success: "Contrat signé." };
}

export async function setReminders(formData: FormData) {
  await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "on";
  const supabase = await createClient();
  await supabase.from("weddings").update({ reminders_enabled: enabled }).eq("id", weddingId);
  revalidatePath(`/mariage/${weddingId}`);
}
