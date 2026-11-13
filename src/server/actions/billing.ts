"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { effectiveVendorPlan, isVendorPlan, planLabel } from "@/lib/domain/plans";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { requireSession } from "@/server/session";
import { checkoutDecision } from "@/lib/domain/stripe-billing";
import { createBillingPortal, createVendorCheckout, stripeEnabled } from "@/server/stripe";

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

export async function startPaymentSetup(): Promise<void> {
  const session = await requireSession();
  if (!session.vendor || !stripeEnabled()) redirect("/abonnement");
  const email = session.email ?? session.profile.email;
  const origin = siteUrl();
  const billing = session.billing;
  const decision = checkoutDecision({
    plan: effectiveVendorPlan(billing?.plan),
    comped: Boolean(billing?.comped),
    status: billing?.status ?? null,
    freeUntil: billing?.free_until ?? null,
    testerUntil: billing?.tester_until ?? null,
    discountPercent: billing?.discount_percent ?? null,
    now: new Date(),
  });
  const checkout = await createVendorCheckout({
    email,
    successUrl: `${origin}/abonnement?regle=1`,
    cancelUrl: `${origin}/abonnement`,
    decision,
    customerId: billing?.stripe_customer_id ?? null,
    vendorId: session.vendor.id,
  });
  if (!checkout.url) redirect("/abonnement?paiement=indisponible");
  redirect(checkout.url);
}

export async function openBillingPortal(): Promise<void> {
  const session = await requireSession();
  if (!session.vendor || !stripeEnabled()) redirect("/abonnement");
  const customerId = session.billing?.stripe_customer_id;
  if (!customerId) redirect("/abonnement?paiement=client");
  const portal = await createBillingPortal({
    customerId,
    returnUrl: `${siteUrl()}/abonnement`,
  });
  if (!portal.url) redirect("/abonnement?paiement=indisponible");
  redirect(portal.url);
}
