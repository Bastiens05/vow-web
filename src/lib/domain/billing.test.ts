import { describe, expect, it } from "vitest";
import { createSubscriptionCheckout } from "@/server/stripe";
import { PLAN_CENTS, subscriptionGate, vendorAccess } from "./billing";

const now = new Date("2026-11-11T12:00:00.000Z");
const future = "2026-11-18T12:00:00.000Z";
const past = "2026-11-01T12:00:00.000Z";

describe("vendorAccess", () => {
  it("never gates a couple", () => {
    const decision = vendorAccess({
      role: "couple",
      isAdmin: false,
      status: "expired",
      trialEndsAt: past,
      testerUntil: past,
      now,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("couple");
  });

  it("never gates an admin, even after the trial", () => {
    const decision = vendorAccess({
      role: "vendor",
      isAdmin: true,
      status: "expired",
      trialEndsAt: past,
      testerUntil: null,
      now,
    });
    expect(decision).toMatchObject({ allowed: true, reason: "admin" });
  });

  it("counts the remaining trial days", () => {
    const decision = vendorAccess({
      role: "vendor",
      isAdmin: false,
      status: "trialing",
      trialEndsAt: future,
      testerUntil: null,
      now,
    });
    expect(decision).toMatchObject({ allowed: true, reason: "trial", daysLeft: 7 });
  });

  it("gates a vendor once the trial is over", () => {
    const decision = vendorAccess({
      role: "vendor",
      isAdmin: false,
      status: "trialing",
      trialEndsAt: past,
      testerUntil: null,
      now,
    });
    expect(decision.allowed).toBe(false);
  });

  it("keeps a tester with no end date", () => {
    const decision = vendorAccess({
      role: "vendor",
      isAdmin: false,
      status: "tester",
      trialEndsAt: past,
      testerUntil: null,
      now,
    });
    expect(decision).toMatchObject({ allowed: true, reason: "tester" });
  });

  it("gates a tester after the access date", () => {
    const decision = vendorAccess({
      role: "vendor",
      isAdmin: false,
      status: "tester",
      trialEndsAt: past,
      testerUntil: past,
      now,
    });
    expect(decision.allowed).toBe(false);
  });

  it("keeps an active subscription", () => {
    const decision = vendorAccess({
      role: "vendor",
      isAdmin: false,
      status: "active",
      trialEndsAt: past,
      testerUntil: null,
      now,
    });
    expect(decision.reason).toBe("active");
  });

  it("prices the single plan at 29,99 €", () => {
    expect(PLAN_CENTS).toBe(2999);
  });
});

describe("subscriptionGate", () => {
  it("sends the app to the subscription page and leaves the offer itself open", () => {
    expect(subscriptionGate("/espace")).toBe(true);
    expect(subscriptionGate("/mariage/abc")).toBe(true);
    expect(subscriptionGate("/abonnement")).toBe(false);
    expect(subscriptionGate("/reglages")).toBe(false);
    expect(subscriptionGate("/")).toBe(false);
    expect(subscriptionGate("/invitation/abc")).toBe(false);
  });
});

describe("Stripe", () => {
  it("does not open a checkout while the flag is off", async () => {
    const enabled = process.env.NEXT_PUBLIC_STRIPE_ENABLED;
    const secret = process.env.STRIPE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_STRIPE_ENABLED;
    delete process.env.STRIPE_SECRET_KEY;
    const result = await createSubscriptionCheckout({
      email: "prestataire@vow.test",
      successUrl: "http://127.0.0.1:3000/abonnement",
      cancelUrl: "http://127.0.0.1:3000/abonnement",
    });
    expect(result.url).toBeNull();
    if (enabled) process.env.NEXT_PUBLIC_STRIPE_ENABLED = enabled;
    if (secret) process.env.STRIPE_SECRET_KEY = secret;
  });
});
