"use server";

import { revalidatePath } from "next/cache";
import { isVendorCategory } from "@/lib/domain/categories";
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

export async function createTesterGrant(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "Réservé aux administrateurs." };
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const trade = String(formData.get("trade") ?? "photographer");
  const plan = String(formData.get("plan") ?? "studio");
  const discount = Number(formData.get("discount_percent") ?? 40);
  const grantType = formData.get("grant_type") === "lifetime" ? "lifetime" : "tester";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Indiquez un e-mail valide." };
  if (!isVendorPlan(plan)) return { error: "Formule inconnue." };
  if (!isVendorCategory(trade)) return { error: "Choisissez un métier." };
  if (grantType === "tester" && (!Number.isInteger(discount) || discount < 0 || discount > 100)) {
    return { error: "Indiquez une remise entre 0 et 100 %." };
  }
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
  const sent = grant
    ? await sendTesterGrantEmail({
        to: grant.email,
        firstName: grant.first_name,
        planLabel: planLabel(grant.plan),
        discountPercent: grant.discount_percent ?? 0,
        url: `${siteUrl()}${testerInviteHref(grant.email, grant.token)}`,
        grantType: grant.grant_type === "lifetime" ? "lifetime" : "tester",
      })
    : false;
  revalidatePath("/admin");
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
  await sendTesterGrantEmail({
    to: grant.email,
    firstName: grant.first_name,
    planLabel: planLabel(grant.plan),
    discountPercent: grant.discount_percent ?? 0,
    url: `${siteUrl()}${testerInviteHref(grant.email, grant.token)}`,
    grantType: grant.grant_type === "lifetime" ? "lifetime" : "tester",
  });
  revalidatePath("/admin");
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
