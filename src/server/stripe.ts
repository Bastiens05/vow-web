export function stripeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_STRIPE_ENABLED === "true" && Boolean(process.env.STRIPE_SECRET_KEY);
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
