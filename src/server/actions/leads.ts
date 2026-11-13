"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { frenchDateToIso } from "@/lib/domain/french-date";
import { splitCoupleNames } from "@/lib/domain/leads";
import { generateInvitationToken } from "@/lib/domain/token";
import { normalizeEmail } from "@/lib/domain/validation";
import { messageFromError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { deliverOutbox } from "@/server/product-mail";
import { requireSession } from "@/server/session";

function clientIp(headerStore: Headers): string {
  const forwarded = headerStore.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0]?.trim().slice(0, 64) ?? "";
}

export async function submitQuote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (String(formData.get("company") ?? "").trim()) return { success: "Demande envoyée." };
  const slug = String(formData.get("slug") ?? "");
  const names = String(formData.get("full_names") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const phone = String(formData.get("phone") ?? "").trim();
  const dateRaw = String(formData.get("wedding_date") ?? "").trim();
  const date = dateRaw ? frenchDateToIso(dateRaw) ?? "" : "";
  const place = String(formData.get("place") ?? "").trim();
  const guestsRaw = String(formData.get("guest_count") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const guests = guestsRaw ? Number(guestsRaw) : null;
  if (names.length < 2) return { error: "Indiquez vos noms." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Indiquez un e-mail valide." };
  if (dateRaw && !date) return { error: "Indiquez la date au format jj/mm/aaaa." };
  if (guests !== null && (!Number.isInteger(guests) || guests < 0 || guests > 2000)) {
    return { error: "Le nombre d'invités n'est pas valide." };
  }

  const headerStore = await headers();
  const supabase = await createClient();
  const { data: leadId, error } = await supabase.rpc("submit_quote_request", {
    p_slug: slug,
    p_names: names,
    p_email: email,
    p_phone: phone,
    p_wedding_date: date || null,
    p_place: place,
    p_guest_count: guests,
    p_message: message,
    p_ip: clientIp(headerStore),
  });
  if (error) return { error: messageFromError(error) };
  await deliverOutbox();
  const reco = String(formData.get("reco") ?? "").trim();
  if (reco && leadId) await supabase.rpc("attribute_quote", { p_lead: leadId, p_token: reco });
  return { success: "Demande envoyée. Le prestataire la retrouve dans VOW." };
}

export async function setLeadStatus(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["nouvelle", "en_discussion", "gagnee", "perdue"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("leads").update({ status }).eq("id", id);
  revalidatePath("/demandes");
}

export async function createWeddingFromLead(formData: FormData) {
  const session = await requireSession();
  if (session.profile.role !== "vendor") redirect("/espace");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) redirect("/demandes");
  if (lead.wedding_id) redirect(`/mariage/${lead.wedding_id}/inviter`);

  const names = splitCoupleNames(lead.full_names);
  const date = lead.wedding_date ?? new Date().toISOString().slice(0, 10);
  const { data: weddingId, error } = await supabase.rpc("create_wedding", {
    p_partner_one: names.one,
    p_partner_two: names.two,
    p_wedding_date: date,
    p_venue_name: lead.place,
    p_venue_city: "",
    p_partner_one_last: names.oneLast,
    p_partner_two_last: names.twoLast,
  });
  if (error || !weddingId) redirect("/demandes");

  await supabase.rpc("create_invitation", {
    p_wedding_id: weddingId,
    p_email: lead.email,
    p_role: "couple",
    p_token: generateInvitationToken(),
  });
  await supabase.from("leads").update({ status: "gagnee", wedding_id: weddingId }).eq("id", lead.id);
  revalidatePath("/demandes");
  redirect(`/mariage/${weddingId}/inviter`);
}
