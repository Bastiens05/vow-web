import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyStripeSignature } from "@/server/stripe-signature";
import {
  billingPatchFromEvent,
  checkoutDecision,
  checkoutFields,
  isStripeTestKey,
  planFromLookup,
} from "./stripe-billing";

const now = new Date("2026-11-12T12:00:00.000Z");

describe("Stripe billing", () => {
  it("recognises a test key without treating a live key as a test", () => {
    expect(isStripeTestKey("sk_test_example")).toBe(true);
    expect(isStripeTestKey("sk_live_example")).toBe(false);
    expect(isStripeTestKey("")).toBe(false);
  });

  it("saves a payment method without charging a gifted or trial account", () => {
    expect(
      checkoutDecision({
        plan: "studio",
        comped: true,
        status: "active",
        freeUntil: null,
        testerUntil: null,
        discountPercent: null,
        now,
      }).mode,
    ).toBe("setup");
    expect(
      checkoutDecision({
        plan: "essentiel",
        comped: false,
        status: "trialing",
        freeUntil: null,
        testerUntil: null,
        discountPercent: null,
        now,
      }).mode,
    ).toBe("setup");
  });

  it("waits out the free year, then applies the 40% coupon", () => {
    const decision = checkoutDecision({
      plan: "pro",
      comped: false,
      status: "active",
      freeUntil: "2027-11-12T12:00:00.000Z",
      testerUntil: null,
      discountPercent: 40,
      now,
    });
    expect(decision.mode).toBe("subscription");
    expect(decision.lookupKey).toBe("vow_pro");
    expect(decision.trialEnd).toBe(Math.floor(new Date("2027-11-12T12:00:00.000Z").getTime() / 1000));
    expect(decision.coupon).toBe("vow_tester_40");
    const fields = checkoutFields({
      decision,
      priceId: "price_123",
      email: "a@vow.test",
      customerId: null,
      vendorId: "vendor-1",
      successUrl: "https://vow.test/ok",
      cancelUrl: "https://vow.test/cancel",
    });
    expect(fields["payment_method_types[0]"]).toBe("card");
    expect(fields["payment_method_types[1]"]).toBe("sepa_debit");
    expect(fields["line_items[0][price]"]).toBe("price_123");
    expect(fields["discounts[0][coupon]"]).toBe("vow_tester_40");
    expect(fields["metadata[trial]"]).toBe("1");
  });

  it("does not let a webhook remove a gifted plan", () => {
    const patch = billingPatchFromEvent(
      "customer.subscription.updated",
      {
        id: "sub_1",
        customer: "cus_1",
        status: "active",
        items: { data: [{ price: { lookup_key: "vow_studio" } }] },
      },
      true,
    );
    expect(patch?.status).toBeUndefined();
    expect(patch?.plan).toBeUndefined();
    expect(patch?.stripe_customer_id).toBe("cus_1");
  });

  it("activates the paid plan and ignores a failed invoice", () => {
    expect(planFromLookup("vow_essentiel")).toBe("essentiel");
    const paid = billingPatchFromEvent(
      "invoice.paid",
      { customer: "cus_1", subscription: "sub_1", amount_paid: 4900 },
      false,
    );
    expect(paid).toMatchObject({ status: "active", stripe_subscription_id: "sub_1" });
    expect(billingPatchFromEvent("invoice.payment_failed", { customer: "cus_1", amount_paid: 0 }, false)).toBeNull();
    const ended = billingPatchFromEvent("customer.subscription.deleted", { customer: "cus_1" }, false);
    expect(ended?.status).toBe("expired");
  });

  it("checks the webhook signature and rejects a stale one", () => {
    const payload = '{"id":"evt_1"}';
    const secret = "whsec_unit_only";
    const timestamp = "1700000000";
    const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
    const header = `t=${timestamp},v1=${signature}`;
    expect(verifyStripeSignature(payload, header, secret, 1700000000 * 1000)).toBe(true);
    expect(verifyStripeSignature(payload, header, secret, 1700000500 * 1000)).toBe(false);
    expect(verifyStripeSignature(payload, header, "whsec_other", 1700000000 * 1000)).toBe(false);
    expect(verifyStripeSignature(payload, null, secret)).toBe(false);
  });
});
