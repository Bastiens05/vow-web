"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Json } from "@/lib/database.types";
import { messageFromError } from "@/lib/errors";
import { generateInvitationToken } from "@/lib/domain/token";
import { normalizeEmail, validateWedding } from "@/lib/domain/validation";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { magicInvitationUrl, sendInvitationEmail } from "@/server/product-mail";
import { requireSession } from "@/server/session";

function readRole(value: FormDataEntryValue | null): "vendor" | "couple" | null {
  if (value === "vendor" || value === "couple") return value;
  return null;
}

export async function createWedding(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (session.profile.role !== "vendor") {
    return { error: "Seuls les prestataires peuvent créer un mariage." };
  }
  const parsed = validateWedding({
    partnerOne: String(formData.get("partner_one") ?? ""),
    partnerOneLast: String(formData.get("partner_one_last") ?? ""),
    partnerTwo: String(formData.get("partner_two") ?? ""),
    partnerTwoLast: String(formData.get("partner_two_last") ?? ""),
    weddingDate: String(formData.get("wedding_date") ?? ""),
    venueName: String(formData.get("venue_name") ?? ""),
    venueCity: String(formData.get("venue_city") ?? ""),
  });
  if (!parsed.ok) return { error: parsed.error };
  const coupleEmail = normalizeEmail(String(formData.get("couple_email") ?? ""));
  if (coupleEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(coupleEmail)) {
    return { error: "Indiquez un e-mail valide pour le couple." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_wedding", {
    p_partner_one: parsed.value.partnerOne,
    p_partner_two: parsed.value.partnerTwo,
    p_wedding_date: parsed.value.weddingDate,
    p_venue_name: parsed.value.venueName,
    p_venue_city: parsed.value.venueCity,
    p_partner_one_last: parsed.value.partnerOneLast,
    p_partner_two_last: parsed.value.partnerTwoLast,
  });
  if (error || !data) return { error: messageFromError(error) };
  if (coupleEmail && coupleEmail !== session.profile.email.toLowerCase()) {
    const token = generateInvitationToken();
    await supabase.rpc("create_invitation", {
      p_wedding_id: data,
      p_email: coupleEmail,
      p_role: "couple",
      p_token: token,
    });
    const { data: wedding } = await supabase
      .from("weddings")
      .select("partner_one_name, partner_two_name")
      .eq("id", data)
      .maybeSingle();
    const title = wedding ? `${wedding.partner_one_name} & ${wedding.partner_two_name}` : "Votre mariage";
    const fallback = `${siteUrl()}/invitation/${token}`;
    const url = await magicInvitationUrl({ email: coupleEmail, role: "couple", token, fallback });
    await sendInvitationEmail({ to: coupleEmail, title, url, role: "couple" });
  }
  redirect(`/mariage/${data}/inviter`);
}

export async function createInvitation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const role = readRole(formData.get("role")) ?? "couple";
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Indiquez un e-mail valide." };
  }
  if (email === session.profile.email.toLowerCase()) {
    return { error: "Vous ne pouvez pas vous inviter vous-même." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invitation", {
    p_wedding_id: weddingId,
    p_email: email,
    p_role: role,
    p_token: generateInvitationToken(),
    p_invitee_name: String(formData.get("invitee_name") ?? "").trim().slice(0, 120),
    p_invitee_trade: String(formData.get("invitee_trade") ?? "").trim().slice(0, 40),
  });
  if (error) return { error: messageFromError(error) };
  const token = readToken(data);
  if (!token) return { error: "L'invitation n'a pas pu être créée." };
  const { data: wedding } = await supabase
    .from("weddings")
    .select("partner_one_name, partner_two_name")
    .eq("id", weddingId)
    .maybeSingle();
  const title = wedding ? `${wedding.partner_one_name} & ${wedding.partner_two_name}` : "Votre mariage";
  const fallback = `${siteUrl()}/invitation/${token}`;
  const url = await magicInvitationUrl({ email, role, token, fallback });
  await sendInvitationEmail({ to: email, title, url, role });
  revalidatePath(`/mariage/${weddingId}`, "layout");
  revalidatePath("/espace");
  revalidatePath(`/mariage/${weddingId}/inviter`);
  return {
    success: url === fallback
      ? "Invitation créée. Copiez le lien ci-dessous. L'e-mail part si l'envoi est configuré."
      : "Invitation envoyée. Le lien magique ouvre le mariage. Il reste aussi affiché ci-dessous.",
  };
}

function readToken(value: Json | null): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const token = value.token;
  return typeof token === "string" ? token : null;
}

export async function revokeInvitation(formData: FormData) {
  await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("invitations").delete().eq("id", id).eq("wedding_id", weddingId).is("accepted_at", null);
  revalidatePath(`/mariage/${weddingId}`, "layout");
  revalidatePath("/espace");
  revalidatePath(`/mariage/${weddingId}/inviter`);
}

export async function resendInvitation(formData: FormData) {
  await createInvitation({}, formData);
}

export async function acceptInvitation(formData: FormData) {
  await requireSession();
  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error || !data) {
    redirect(`/invitation/${token}?error=${encodeURIComponent(messageFromError(error))}`);
  }
  redirect(`/mariage/${data}`);
}
