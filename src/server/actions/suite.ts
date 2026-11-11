"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eurosToCents } from "@/lib/domain/money";
import { slugify } from "@/lib/domain/slug";
import { generateInvitationToken } from "@/lib/domain/token";
import { normalizeEmail } from "@/lib/domain/validation";
import { messageFromError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { deliverOutbox } from "@/server/product-mail";
import { sendEmail } from "@/server/mail";
import { siteUrl } from "@/lib/env";
import { requireSession } from "@/server/session";

export async function inviteTeammate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.vendor || session.vendor.user_id !== session.userId) {
    return { error: "Seul le titulaire de l'activité peut inviter." };
  }
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Indiquez un e-mail valide." };
  const token = generateInvitationToken();
  const supabase = await createClient();
  const { error } = await supabase.from("vendor_team_invites").insert({
    vendor_id: session.vendor.id,
    email,
    token,
  });
  if (error) return { error: messageFromError(error) };
  const url = `${siteUrl()}/equipe/${token}`;
  await sendEmail({
    to: email,
    subject: `Équipe · ${session.vendor.business_name}`,
    heading: session.vendor.business_name,
    body: "On vous ouvre l'activité. Les mariages sont visibles. La facturation reste au titulaire.",
    buttonLabel: "Rejoindre l'équipe",
    buttonUrl: url,
  });
  revalidatePath("/reglages");
  return { success: `Invitation prête. ${url}` };
}

export async function removeTeammate(formData: FormData) {
  const session = await requireSession();
  if (!session.vendor) redirect("/reglages");
  const userId = String(formData.get("user_id") ?? "");
  const supabase = await createClient();
  await supabase.from("vendor_members").delete().eq("vendor_id", session.vendor.id).eq("user_id", userId);
  revalidatePath("/reglages");
}

export async function acceptTeamInvite(formData: FormData) {
  await requireSession();
  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_team_invite", { p_token: token });
  if (error) redirect(`/equipe/${token}?error=${encodeURIComponent(messageFromError(error))}`);
  redirect("/mariages");
}

export async function saveAvailability(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.vendor || session.vendor.user_id !== session.userId) return { error: "Réservé au titulaire." };
  const weekday = Number(formData.get("weekday"));
  const start = String(formData.get("start_time") ?? "");
  const end = String(formData.get("end_time") ?? "");
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return { error: "Choisissez un jour." };
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || end <= start) {
    return { error: "L'heure de fin suit l'heure de début." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("availability_rules").insert({
    vendor_id: session.vendor.id,
    weekday,
    start_time: start,
    end_time: end,
  });
  if (error) return { error: "Ce créneau existe déjà." };
  revalidatePath("/reglages");
  return { success: "Créneau ajouté." };
}

export async function deleteAvailability(formData: FormData) {
  const session = await requireSession();
  if (!session.vendor) redirect("/reglages");
  const supabase = await createClient();
  await supabase.from("availability_rules").delete().eq("id", String(formData.get("id") ?? "")).eq("vendor_id", session.vendor.id);
  revalidatePath("/reglages");
}

export async function bookAppointment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = String(formData.get("slug") ?? "");
  const name = String(formData.get("full_name") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const starts = String(formData.get("starts_at") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const wedding = String(formData.get("wedding_id") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.rpc("book_appointment", {
    p_slug: slug,
    p_name: name,
    p_email: email,
    p_starts: starts,
    p_note: note,
    p_wedding: wedding || null,
  });
  if (error) return { error: messageFromError(error) };
  await deliverOutbox();
  return { success: "Rendez-vous confirmé. Un e-mail part si l'envoi est configuré." };
}

export async function cancelAppointment(formData: FormData) {
  const session = await requireSession();
  if (!session.vendor) redirect("/espace/rendez-vous");
  const supabase = await createClient();
  await supabase.from("appointments").update({ status: "cancelled" }).eq("id", String(formData.get("id") ?? "")).eq("vendor_id", session.vendor.id);
  revalidatePath("/espace/rendez-vous");
}

export async function ensureRsvp(formData: FormData) {
  const session = await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const supabase = await createClient();
  const { data: existing } = await supabase.from("rsvp_pages").select("token").eq("wedding_id", weddingId).maybeSingle();
  if (!existing) {
    await supabase.from("rsvp_pages").insert({ wedding_id: weddingId, token: generateInvitationToken() });
  }
  revalidatePath(`/mariage/${weddingId}/rsvp`);
  void session;
}

export async function submitRsvp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_rsvp", {
    p_token: String(formData.get("token") ?? ""),
    p_name: String(formData.get("full_name") ?? ""),
    p_attending: formData.get("attending") === "yes",
    p_diet: String(formData.get("diet") ?? ""),
  });
  if (error) return { error: messageFromError(error) };
  return { success: "Réponse enregistrée. Merci." };
}

export async function addTable(formData: FormData) {
  await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1) redirect(`/mariage/${weddingId}/tables`);
  const supabase = await createClient();
  await supabase.from("seating_tables").insert({ wedding_id: weddingId, name });
  revalidatePath(`/mariage/${weddingId}/tables`);
}

export async function assignSeat(formData: FormData) {
  await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const guestId = String(formData.get("guest_id") ?? "");
  const tableId = String(formData.get("table_id") ?? "");
  const supabase = await createClient();
  if (!tableId) {
    await supabase.from("seating_assignments").delete().eq("guest_id", guestId);
  } else {
    await supabase.from("seating_assignments").upsert({ guest_id: guestId, table_id: tableId });
  }
  revalidatePath(`/mariage/${weddingId}/tables`);
}

export async function saveBudget(formData: FormData) {
  await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const total = eurosToCents(String(formData.get("total") ?? ""));
  const label = String(formData.get("label") ?? "").trim();
  const line = eurosToCents(String(formData.get("amount") ?? ""));
  if (total === null) redirect(`/mariage/${weddingId}/budget`);
  const supabase = await createClient();
  await supabase.from("wedding_budgets").upsert({ wedding_id: weddingId, total_cents: total });
  if (label && line !== null) {
    await supabase.from("budget_lines").insert({ wedding_id: weddingId, label, amount_cents: line });
  }
  revalidatePath(`/mariage/${weddingId}/budget`);
}

export async function saveSite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const requested = slugify(String(formData.get("slug") ?? ""));
  const slug = requested.length >= 3 ? requested : `mariage-${weddingId.slice(0, 6)}`;
  const supabase = await createClient();
  const { error } = await supabase.from("wedding_sites").upsert({
    wedding_id: weddingId,
    slug,
    place: String(formData.get("place") ?? "").trim(),
    programme: String(formData.get("programme") ?? "").trim(),
    note: String(formData.get("note") ?? "").trim(),
    published: formData.get("published") === "on",
  });
  if (error) return { error: "Ce lien est déjà pris. Choisissez-en un autre." };
  revalidatePath(`/mariage/${weddingId}/site`);
  revalidatePath(`/m/${slug}`);
  return { success: formData.get("published") === "on" ? "Page publiée." : "Brouillon enregistré." };
}

export async function rotateCalendar() {
  const session = await requireSession();
  const supabase = await createClient();
  await supabase.rpc("rotate_calendar_feed");
  revalidatePath("/reglages");
  void session;
}
