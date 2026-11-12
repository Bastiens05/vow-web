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
  revalidatePath("/reglages");
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

