import { planLabel, type VendorPlan } from "@/lib/domain/plans";

export type GrantType = "tester" | "lifetime";

export type BillingState = {
  plan: VendorPlan;
  comped: boolean;
  testerUntil: string | null;
  discountPercent: number | null;
};

export type GrantOffer = {
  grantType: GrantType;
  plan: VendorPlan;
  discountPercent: number | null;
};

export const UNGIFTED_BILLING: BillingState = {
  plan: "essentiel",
  comped: false,
  testerUntil: null,
  discountPercent: null,
};

/** The sentence shown on the in-app card. */
export function grantOfferBody(input: { plan: VendorPlan; grantType: GrantType; discountPercent: number | null }): string {
  const label = planLabel(input.plan);
  if (input.grantType === "lifetime") return `VOW vous offre ${label} pour toujours.`;
  return `VOW vous offre ${label} pendant un an, puis -${input.discountPercent ?? 0} % à vie.`;
}

function plusOneYear(now: Date): string {
  const next = new Date(now.getTime());
  next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next.toISOString();
}

/** Billing written when an invitation is activated, at signup or from the bell. */
export function appliedGrantBilling(grant: GrantOffer, now: Date): BillingState {
  if (grant.grantType === "lifetime") {
    return { plan: grant.plan, comped: true, testerUntil: null, discountPercent: null };
  }
  return {
    plan: grant.plan,
    comped: true,
    testerUntil: plusOneYear(now),
    discountPercent: grant.discountPercent ?? 40,
  };
}

/**
 * An existing vendor keeps the current billing. The offer waits in the bell
 * until the vendor activates it. A missing account gets no card.
 */
export function receiveGrant(input: {
  hasVendorAccount: boolean;
  billing: BillingState;
  grant: GrantOffer;
}): { status: "invited"; billing: BillingState; notice: string | null } {
  if (!input.hasVendorAccount) {
    return { status: "invited", billing: input.billing, notice: null };
  }
  return { status: "invited", billing: input.billing, notice: grantOfferBody(input.grant) };
}

export function activateGrant(input: { grant: GrantOffer; now: Date }): { status: "accepted"; billing: BillingState } {
  return { status: "accepted", billing: appliedGrantBilling(input.grant, input.now) };
}

const SHARE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A readable code. Empty admin input uses this. */
export function suggestShareCode(random: () => number = Math.random): string {
  let body = "";
  for (let index = 0; index < 8; index += 1) {
    body += SHARE_ALPHABET[Math.floor(random() * SHARE_ALPHABET.length)] ?? "A";
  }
  return `VOW-${body}`;
}

/**
 * A share code with a type applies the same offer as an e-mail invitation.
 * A code from before this choice (no type) stays on the old access path.
 */
export function billingFromShareCode(input: {
  grantType: GrantType | null;
  plan: VendorPlan | null;
  discountPercent: number | null;
  now: Date;
}): BillingState | null {
  if (!input.grantType || !input.plan) return null;
  return appliedGrantBilling(
    { grantType: input.grantType, plan: input.plan, discountPercent: input.discountPercent },
    input.now,
  );
}

/** New vendor row. No invitation and no listed email stays on the unpaid default. */
export function billingAtSignup(input: { grant: GrantOffer | null; compPlan: VendorPlan | null; now: Date }): BillingState {
  if (input.grant) return appliedGrantBilling(input.grant, input.now);
  if (input.compPlan) return { plan: input.compPlan, comped: true, testerUntil: null, discountPercent: null };
  return UNGIFTED_BILLING;
}
