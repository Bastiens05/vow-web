"use server";

import { revalidatePath } from "next/cache";
import { isVendorCategory } from "@/lib/domain/categories";
import { suggestShareCode } from "@/lib/domain/grants";
import { isVendorPlan, planLabel, testerInviteHref } from "@/lib/domain/plans";
import { normalizeEmail } from "@/lib/domain/validation";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { emailChannelEnabled } from "@/server/mail";
import { sendTesterGrantEmail } from "@/server/product-mail";
import { requireSession } from "@/server/session";

async function requireAdmin() {
  const session = await requireSession();
  if (!session.isAdmin) return null;
  return session;
}

export async function createInvite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "Réservé aux administrateurs." };
  const delivery = formData.get("delivery") === "code" ? "code" : "email";
  const plan = String(formData.get("plan") ?? "studio");
  const grantType = formData.get("grant_type") === "lifetime" ? "lifetime" : "tester";
  const discount = Number(formData.get("discount_percent") ?? 40);
  if (!isVendorPlan(plan)) return { error: "Formule inconnue." };
  if (grantType === "tester" && (!Number.isInteger(discount) || discount < 0 || discount > 100)) {
    return { error: "Indiquez une remise entre 0 et 100 %." };
  }
  if (delivery === "code") return createShareInvite(formData, plan, grantType, discount);
  return createEmailInvite(formData, plan, grantType, discount);
}

async function createShareInvite(
  formData: FormData,
  plan: string,
  grantType: "tester" | "lifetime",
  discount: number,
): Promise<ActionState> {
  const maxUses = Number(formData.get("max_uses") ?? 1);
  const expires = String(formData.get("expires_at") ?? "").trim();
  const supplied = String(formData.get("code") ?? "").trim();
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 10000) {
    return { error: "Indiquez un nombre d'utilisations entre 1 et 10 000." };
  }
  if (supplied && (supplied.length < 8 || supplied.length > 64)) {
    return { error: "Le code doit faire entre 8 et 64 caractères, ou rester vide." };
  }
  const code = supplied || suggestShareCode();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_share_code", {
    p_grant_type: grantType,
    p_plan: plan,
    p_discount: grantType === "tester" ? discount : null,
    p_max_uses: maxUses,
    p_expires: expires ? new Date(expires).toISOString() : null,
    p_code: code,
  });
  if (error || !data) {
    if (error?.message?.includes("existe déjà")) return { error: "Ce code existe déjà." };
    return { error: "Le code n'a pas pu être créé." };
  }
  revalidatePath("/admin");
  return { success: `Code ${data} créé. Copiez-le dans la liste pour le partager.` };
}

async function createEmailInvite(
  formData: FormData,
  plan: string,
  grantType: "tester" | "lifetime",
  discount: number,
): Promise<ActionState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const trade = String(formData.get("trade") ?? "photographer");
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Indiquez un e-mail valide." };
  if (!isVendorCategory(trade)) return { error: "Choisissez un métier." };
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("create_tester_grant", {
    p_email: email,
    p_first_name: firstName,
    p_last_name: lastName,
    p_trade: trade,
    p_plan: plan,
    p_discount: grantType === "tester" ? discount : 0,
    p_grant_type: grantType,
  });
  if (error || !id) {
    if (error?.message?.includes("existe déjà")) return { error: "Une offre existe déjà pour cette adresse." };
    return { error: "L'offre n'a pas pu être enregistrée." };
  }
  const { data: grant } = await supabase.from("tester_grants").select("token, first_name, plan, discount_percent, email, grant_type").eq("id", id).maybeSingle();
  const { data: notice } = await supabase.from("grant_notices").select("id").eq("grant_id", id).maybeSingle();
  const sent = grant
    ? await sendTesterGrantEmail({
        to: grant.email,
        firstName: grant.first_name,
        planLabel: planLabel(grant.plan),
        discountPercent: grant.discount_percent ?? 0,
        url: notice ? `${siteUrl()}/alertes` : `${siteUrl()}${testerInviteHref(grant.email, grant.token)}`,
        grantType: grant.grant_type === "lifetime" ? "lifetime" : "tester",
        existingAccount: Boolean(notice),
      })
    : false;
  revalidatePath("/admin");
  revalidatePath("/alertes");
  if (notice) {
    if (!emailChannelEnabled() || !sent) {
      return { success: "Le prestataire a déjà un compte. L'offre est dans sa cloche. L'e-mail n'a pas été envoyé." };
    }
    return { success: "Le prestataire a déjà un compte. L'offre est dans sa cloche, à activer." };
  }
  if (!emailChannelEnabled() || !sent) {
    return { success: "Offre enregistrée. L'e-mail n'a pas été envoyé : le canal est fermé." };
  }
  return { success: "Invitation envoyée." };
}

export async function resendTesterGrant(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  if (!session) return;
  const id = String(formData.get("grant_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const { data: grant } = await supabase.from("tester_grants").select("*").eq("id", id).maybeSingle();
  if (!grant || grant.status === "revoked") return;
  if (!emailChannelEnabled()) return;
  const { data: notice } = await supabase.from("grant_notices").select("id, activated_at").eq("grant_id", id).maybeSingle();
  const waiting = Boolean(notice && !notice.activated_at);
  await sendTesterGrantEmail({
    to: grant.email,
    firstName: grant.first_name,
    planLabel: planLabel(grant.plan),
    discountPercent: grant.discount_percent ?? 0,
    url: waiting ? `${siteUrl()}/alertes` : `${siteUrl()}${testerInviteHref(grant.email, grant.token)}`,
    grantType: grant.grant_type === "lifetime" ? "lifetime" : "tester",
    existingAccount: waiting,
  });
  revalidatePath("/admin");
}

export async function activateTesterGrant(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (session.profile.role !== "vendor") return { error: "Réservé aux prestataires." };
  const id = String(formData.get("grant_id") ?? "");
  if (!id) return { error: "Invitation introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("activate_tester_grant", { p_id: id });
  if (error) return { error: "L'offre n'a pas pu être activée." };
  revalidatePath("/alertes");
  revalidatePath("/abonnement");
  revalidatePath("/espace");
  revalidatePath("/admin");
  return { success: "Offre activée." };
}

export async function revokeShareCode(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  if (!session) return;
  const id = String(formData.get("code_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.rpc("revoke_share_code", { p_id: id });
  revalidatePath("/admin");
  revalidatePath("/abonnement");
  revalidatePath("/reglages");
}

export async function revokeTesterGrant(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  if (!session) return;
  const id = String(formData.get("grant_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.rpc("revoke_tester_grant", { p_id: id });
  revalidatePath("/admin");
  revalidatePath("/abonnement");
}
