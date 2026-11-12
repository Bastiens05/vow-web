"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { effectiveVendorPlan, isVendorPlan, planLabel } from "@/lib/domain/plans";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { requireSession } from "@/server/session";
import { createSubscriptionCheckout, stripeEnabled } from "@/server/stripe";

export async function redeemTesterCode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (session.profile.role !== "vendor" || !session.vendor) return { error: "Réservé aux prestataires." };
  const code = String(formData.get("tester_code") ?? "").trim();
  if (code.length < 8) return { error: "Indiquez le code." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_tester_code", { p_code: code });
  if (error) return { error: "Ce code n'est pas valable." };
  revalidatePath("/abonnement");
  revalidatePath("/espace");
  return { success: "Code accepté. L'accès est ouvert." };
}


export async function chooseVendorPlan(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (session.profile.role !== "vendor" || !session.vendor) return { error: "Réservé aux prestataires." };
  const requested = String(formData.get("plan") ?? "");
  if (!isVendorPlan(requested)) return { error: "Formule inconnue." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("choose_vendor_plan", { p_plan: requested });
  if (error || !data) return { error: "La formule n'a pas pu être enregistrée." };
  const plan = effectiveVendorPlan(String(data));
  revalidatePath("/abonnement");
  revalidatePath("/espace");
  if (plan !== requested || (session.billing?.comped && plan === "studio")) {
    return { success: "Formule Studio offerte, sans paiement." };
  }
  return { success: `Formule ${planLabel(plan)} enregistrée. Le paiement en ligne reste fermé.` };
}

export async function startSubscription(): Promise<void> {
  const session = await requireSession();
  if (!session.vendor || !stripeEnabled()) redirect("/abonnement");
  const email = session.email ?? session.profile.email;
  const origin = siteUrl();
  const checkout = await createSubscriptionCheckout({
    email,
    successUrl: `${origin}/abonnement?regle=1`,
    cancelUrl: `${origin}/abonnement`,
  });
  if (!checkout.url) redirect("/abonnement");
  redirect(checkout.url);
}

export async function createTesterCode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.isAdmin) return { error: "Réservé à l'administration." };
  const label = String(formData.get("label") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const maxUses = Number(formData.get("max_uses") ?? "1");
  const expires = String(formData.get("expires_at") ?? "").trim();
  const accessUntil = String(formData.get("access_until") ?? "").trim();
  if (label.length < 2) return { error: "Indiquez un libellé." };
  if (code.length < 8) return { error: "Le code doit faire au moins 8 caractères." };
  if (!Number.isInteger(maxUses) || maxUses < 1) return { error: "Indiquez un nombre d'utilisations." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_tester_code", {
    p_label: label,
    p_code: code,
    p_max_uses: maxUses,
    p_expires: expires ? new Date(expires).toISOString() : null,
    p_access_until: accessUntil ? new Date(accessUntil).toISOString() : null,
  });
  if (error) return { error: "Le code n'a pas pu être créé." };
  revalidatePath("/admin");
  return { success: "Code créé. Il ne sera plus affiché : transmettez-le maintenant." };
}
