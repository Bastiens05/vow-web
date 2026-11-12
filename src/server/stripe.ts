import { checkoutFields, isStripeTestKey, type CheckoutDecision } from "@/lib/domain/stripe-billing";

export function stripeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_STRIPE_ENABLED === "true" && Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripeTestMode(): boolean {
  return isStripeTestKey(process.env.STRIPE_SECRET_KEY ?? "");
}

async function stripeRequest(path: string, body?: URLSearchParams): Promise<unknown | null> {
  if (!stripeEnabled()) return null;
  const secret = process.env.STRIPE_SECRET_KEY ?? "";
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
  });
  if (!response.ok) return null;
  return response.json();
}

export async function priceIdForLookup(lookupKey: string): Promise<string | null> {
  const payload = (await stripeRequest(`prices?lookup_keys[]=${encodeURIComponent(lookupKey)}&active=true&limit=1`)) as {
    data?: { id?: string }[];
  } | null;
  return payload?.data?.[0]?.id ?? null;
}

export async function createSubscriptionCheckout(input: {
  email: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string | null }> {
  return createVendorCheckout({
    ...input,
    decision: { mode: "subscription", lookupKey: "vow_essentiel", trialEnd: null, coupon: null },
    customerId: null,
    vendorId: "",
  });
}

export async function createVendorCheckout(input: {
  email: string;
  successUrl: string;
  cancelUrl: string;
  decision: CheckoutDecision;
  customerId: string | null;
  vendorId: string;
}): Promise<{ url: string | null }> {
  if (!stripeEnabled()) return { url: null };
  const priceId = input.decision.lookupKey ? await priceIdForLookup(input.decision.lookupKey) : null;
  if (input.decision.mode === "subscription" && !priceId) return { url: null };
  const fields = checkoutFields({
    decision: input.decision,
    priceId,
    email: input.email,
    customerId: input.customerId,
    vendorId: input.vendorId,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
  });
  const payload = (await stripeRequest("checkout/sessions", new URLSearchParams(fields))) as { url?: string } | null;
  return { url: payload?.url ?? null };
}

export async function createBillingPortal(input: { customerId: string; returnUrl: string }): Promise<{ url: string | null }> {
  if (!stripeEnabled()) return { url: null };
  const payload = (await stripeRequest(
    "billing_portal/sessions",
    new URLSearchParams({ customer: input.customerId, return_url: input.returnUrl }),
  )) as { url?: string } | null;
  return { url: payload?.url ?? null };
}

export async function createDepositCheckout(input: {
  amountCents: number;
  title: string;
  successUrl: string;
  cancelUrl: string;
  vendorAccount: string | null;
}): Promise<{ url: string | null }> {
  if (!stripeEnabled()) return { url: null };
  const secret = process.env.STRIPE_SECRET_KEY ?? "";
  const body = new URLSearchParams({
    mode: "payment",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(input.amountCents),
    "line_items[0][price_data][product_data][name]": input.title,
  });
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (input.vendorAccount) headers["Stripe-Account"] = input.vendorAccount;
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers,
    body,
  });
  if (!response.ok) return { url: null };
  const payload = (await response.json()) as { url?: string };
  return { url: payload.url ?? null };
}
