"use server";

import { revalidatePath } from "next/cache";
import { draftFromModelText, type QuoteDraft } from "@/lib/domain/quote-extract";
import { isVendorCategory } from "@/lib/domain/categories";
import { messageFromError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { getWeddingSpace } from "@/server/data";
import { requireSession } from "@/server/session";
import { createInvitation } from "@/server/actions/weddings";

async function coupleClient(weddingId: string) {
  await requireSession();
  const space = await getWeddingSpace(weddingId);
  if (!(space.role === "couple" || space.actingAsCouple)) return null;
  return createClient();
}

async function tryExtract(fileName: string): Promise<QuoteDraft> {
  if (process.env.AI_ASSISTANT_ENABLED !== "true") return draftFromModelText("");
  const key = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!key) return draftFromModelText("");
  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `Le couple a déposé un devis nommé « ${fileName} ». Réponds uniquement un JSON {"business_name","category","email","phone","amount_cents"}. category parmi photographer, videographer, dj, florist, caterer, venue, planner, beauty, officiant, other. Si une valeur est inconnue, laisse-la vide. N'invente pas d'e-mail.`,
          },
        ],
      }),
    });
    if (!response.ok) return draftFromModelText("");
    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    return draftFromModelText(body.choices?.[0]?.message?.content ?? "");
  } catch {
    return draftFromModelText("");
  }
}

export async function startQuoteIntake(
  weddingId: string,
  input: { storagePath: string; fileName: string; mimeType: string },
): Promise<ActionState & { id?: string; draft?: QuoteDraft }> {
  const supabase = await coupleClient(weddingId);
  if (!supabase) return { error: "Réservé aux mariés." };
  if (!input.storagePath.startsWith(`${weddingId}/`)) return { error: "Fichier invalide." };
  const draft = await tryExtract(input.fileName);
  const { data, error } = await supabase
    .from("quote_intakes")
    .insert({
      wedding_id: weddingId,
      storage_path: input.storagePath,
      file_name: input.fileName,
      mime_type: input.mimeType,
      business_name: draft.businessName,
      category: draft.category,
      email: draft.email,
      phone: draft.phone,
      amount_cents: draft.amountCents,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error ? messageFromError(error) : "Le devis n'a pas été enregistré." };
  return { success: "Vérifiez les informations avant d'envoyer l'invitation.", id: data.id, draft };
}

export async function confirmQuoteInvite(weddingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await coupleClient(weddingId);
  if (!supabase) return { error: "Réservé aux mariés." };
  const id = String(formData.get("intake_id") ?? "");
  const business = String(formData.get("business_name") ?? "").trim();
  const category = String(formData.get("category") ?? "other");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const euros = Number(String(formData.get("amount") ?? "").replace(",", "."));
  if (business.length < 2) return { error: "Indiquez le nom." };
  if (!isVendorCategory(category)) return { error: "Choisissez un métier." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Indiquez un e-mail valide." };
  const invite = new FormData();
  invite.set("wedding_id", weddingId);
  invite.set("role", "vendor");
  invite.set("email", email);
  invite.set("invitee_name", business);
  invite.set("invitee_trade", category);
  const sent = await createInvitation({}, invite);
  if (sent.error) return sent;
  const amount = Number.isFinite(euros) && euros >= 0 ? Math.round(euros * 100) : null;
  const { error } = await supabase
    .from("quote_intakes")
    .update({ business_name: business, category, email, phone, amount_cents: amount, status: "sent" })
    .eq("id", id)
    .eq("wedding_id", weddingId);
  if (error) return { error: messageFromError(error) };
  if (amount !== null) {
    await supabase.from("budget_lines").insert({
      wedding_id: weddingId,
      label: business,
      amount_cents: amount,
      sort_order: 50,
    });
  }
  revalidatePath(`/mariage/${weddingId}/equipe`);
  revalidatePath(`/mariage/${weddingId}/documents`);
  revalidatePath(`/mariage/${weddingId}/budget`);
  return { success: sent.success ?? "Invitation envoyée." };
}
