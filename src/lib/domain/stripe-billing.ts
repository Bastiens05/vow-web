import type { VendorPlan } from "@/lib/domain/plans";

export const STRIPE_LOOKUP: Record<VendorPlan, string> = {
  essentiel: "vow_essentiel",
  pro: "vow_pro",
  studio: "vow_studio",
};

export const STRIPE_PRICE_CENTS: Record<VendorPlan, number> = {
  essentiel: 2900,
  pro: 4900,
  studio: 8900,
};

export const TESTER_COUPON_ID = "vow_tester_40";

export type BillingStatus = "trialing" | "active" | "expired" | "tester";

export type CheckoutDecision = {
  mode: "setup" | "subscription";
  lookupKey: string | null;
  trialEnd: number | null;
  coupon: string | null;
};

export function isStripeTestKey(key: string): boolean {
  return key.startsWith("sk_test_");
}

/** Setup saves a card or SEPA without charging. A tester subscription waits out the free year, then the coupon applies. */
export function checkoutDecision(input: {
  plan: VendorPlan;
  comped: boolean;
  status: BillingStatus | null;
  freeUntil: string | null;
  testerUntil: string | null;
  discountPercent: number | null;
  now: Date;
}): CheckoutDecision {
  if (input.comped || input.status === "trialing") {
    return { mode: "setup", lookupKey: null, trialEnd: null, coupon: null };
  }
  const now = input.now.getTime();
  const ends = [input.freeUntil, input.testerUntil]
    .map((iso) => (iso ? new Date(iso).getTime() : 0))
    .filter((time) => time > now);
  const trialEnd = ends.length > 0 ? Math.floor(Math.max(...ends) / 1000) : null;
  return {
    mode: "subscription",
    lookupKey: STRIPE_LOOKUP[input.plan],
    trialEnd,
    coupon: input.discountPercent === 40 ? TESTER_COUPON_ID : null,
  };
}

export function planFromLookup(lookup: string | null | undefined): VendorPlan | null {
  if (lookup === "vow_essentiel") return "essentiel";
  if (lookup === "vow_pro") return "pro";
  if (lookup === "vow_studio") return "studio";
  return null;
}

export type BillingPatch = {
  stripe_customer_id?: string;
  stripe_subscription_id?: string | null;
  status?: BillingStatus;
  plan?: VendorPlan;
};

type StripeObject = Record<string, unknown>;

function asObject(value: unknown): StripeObject | null {
  return value && typeof value === "object" ? (value as StripeObject) : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function customerIdFrom(object: StripeObject): string | null {
  const customer = object.customer;
  if (typeof customer === "string") return customer;
  return text(asObject(customer)?.id);
}

export function vendorIdFrom(object: StripeObject): string | null {
  const metadata = asObject(object.metadata);
  return text(metadata?.vendor_id) ?? text(object.client_reference_id);
}

function subscriptionStatus(value: unknown): BillingStatus | null {
  if (value === "trialing") return "trialing";
  if (value === "active" || value === "past_due") return "active";
  if (value === "canceled" || value === "unpaid" || value === "incomplete_expired") return "expired";
  return null;
}

function planFromSubscription(object: StripeObject): VendorPlan | null {
  const items = asObject(object.items);
  const data = Array.isArray(items?.data) ? items.data : [];
  const first = asObject(data[0]);
  const price = asObject(first?.price);
  return planFromLookup(text(price?.lookup_key));
}

/** What a verified Stripe event may write. A gifted account never loses its free plan. */
export function billingPatchFromEvent(type: string, object: StripeObject, comped: boolean): BillingPatch | null {
  const customer = customerIdFrom(object);
  if (type === "checkout.session.completed") {
    const patch: BillingPatch = {};
    if (customer) patch.stripe_customer_id = customer;
    const subscription = text(object.subscription);
    if (subscription) patch.stripe_subscription_id = subscription;
    if (!comped && object.mode === "subscription") {
      const plan = planFromLookup(text(asObject(object.metadata)?.plan_lookup)) ?? planFromLookup(text(asObject(object.metadata)?.lookup_key));
      if (plan) patch.plan = plan;
      patch.status = text(asObject(object.metadata)?.trial) === "1" ? "trialing" : "active";
    }
    return Object.keys(patch).length > 0 ? patch : null;
  }
  if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
    const patch: BillingPatch = {};
    if (customer) patch.stripe_customer_id = customer;
    const id = text(object.id);
    if (id) patch.stripe_subscription_id = id;
    if (!comped) {
      const status = subscriptionStatus(object.status);
      if (status) patch.status = status;
      const plan = planFromSubscription(object);
      if (plan) patch.plan = plan;
    }
    return Object.keys(patch).length > 0 ? patch : null;
  }
  if (type === "customer.subscription.deleted") {
    const patch: BillingPatch = {};
    if (customer) patch.stripe_customer_id = customer;
    if (!comped) patch.status = "expired";
    return Object.keys(patch).length > 0 ? patch : null;
  }
  if (type === "invoice.paid") {
    const patch: BillingPatch = {};
    if (customer) patch.stripe_customer_id = customer;
    const subscription = text(object.subscription);
    if (subscription) patch.stripe_subscription_id = subscription;
    if (!comped && typeof object.amount_paid === "number" && object.amount_paid > 0) patch.status = "active";
    return Object.keys(patch).length > 0 ? patch : null;
  }
  if (type === "invoice.payment_failed") return null;
  return null;
}

export function checkoutFields(input: {
  decision: CheckoutDecision;
  priceId: string | null;
  email: string;
  customerId: string | null;
  vendorId: string;
  successUrl: string;
  cancelUrl: string;
}): Record<string, string> {
  const fields: Record<string, string> = {
    mode: input.decision.mode,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    "metadata[vendor_id]": input.vendorId,
    client_reference_id: input.vendorId,
    "payment_method_types[0]": "card",
    "payment_method_types[1]": "sepa_debit",
  };
  if (input.customerId) fields.customer = input.customerId;
  else fields.customer_email = input.email;
  if (input.decision.mode === "setup") {
    fields.currency = "eur";
    return fields;
  }
  if (input.priceId) fields["line_items[0][price]"] = input.priceId;
  fields["line_items[0][quantity]"] = "1";
  fields["subscription_data[metadata][vendor_id]"] = input.vendorId;
  if (input.decision.lookupKey) fields["metadata[lookup_key]"] = input.decision.lookupKey;
  if (input.decision.trialEnd) {
    fields["subscription_data[trial_end]"] = String(input.decision.trialEnd);
    fields["metadata[trial]"] = "1";
  }
  if (input.decision.coupon) fields["discounts[0][coupon]"] = input.decision.coupon;
  return fields;
}
