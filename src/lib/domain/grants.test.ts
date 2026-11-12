import { describe, expect, it } from "vitest";
import { activateGrant, billingAtSignup, grantOfferBody, receiveGrant, UNGIFTED_BILLING } from "./grants";

const now = new Date("2026-11-12T22:00:00.000Z");
const current = { ...UNGIFTED_BILLING, plan: "essentiel" as const };

describe("grant delivery", () => {
  it("does not gift an existing account until the vendor activates", () => {
    const tester = receiveGrant({
      hasVendorAccount: true,
      billing: current,
      grant: { grantType: "tester", plan: "pro", discountPercent: 40 },
    });
    expect(tester.status).toBe("invited");
    expect(tester.billing).toEqual(current);
    expect(tester.billing.comped).toBe(false);
    expect(tester.notice).toBe("VOW vous offre Pro pendant un an, puis -40 % à vie.");

    const lifetime = receiveGrant({
      hasVendorAccount: true,
      billing: current,
      grant: { grantType: "lifetime", plan: "studio", discountPercent: null },
    });
    expect(lifetime.billing).toEqual(current);
    expect(lifetime.notice).toBe(grantOfferBody({ plan: "studio", grantType: "lifetime", discountPercent: null }));

    const activatedTester = activateGrant({ grant: { grantType: "tester", plan: "pro", discountPercent: 40 }, now });
    expect(activatedTester.status).toBe("accepted");
    expect(activatedTester.billing).toEqual({
      plan: "pro",
      comped: true,
      testerUntil: "2027-11-12T22:00:00.000Z",
      discountPercent: 40,
    });

    const activatedLife = activateGrant({ grant: { grantType: "lifetime", plan: "studio", discountPercent: null }, now });
    expect(activatedLife.billing).toEqual({
      plan: "studio",
      comped: true,
      testerUntil: null,
      discountPercent: null,
    });
  });

  it("applies the offer when a new account signs up with the invitation", () => {
    expect(
      billingAtSignup({ grant: { grantType: "tester", plan: "pro", discountPercent: 40 }, compPlan: null, now }),
    ).toEqual({
      plan: "pro",
      comped: true,
      testerUntil: "2027-11-12T22:00:00.000Z",
      discountPercent: 40,
    });
    expect(
      billingAtSignup({ grant: { grantType: "lifetime", plan: "essentiel", discountPercent: null }, compPlan: null, now }),
    ).toEqual({
      plan: "essentiel",
      comped: true,
      testerUntil: null,
      discountPercent: null,
    });
  });

  it("does not gift a signup without an invitation or a listed email", () => {
    expect(billingAtSignup({ grant: null, compPlan: null, now })).toEqual(UNGIFTED_BILLING);
    expect(billingAtSignup({ grant: null, compPlan: null, now }).comped).toBe(false);
  });

  it("keeps a listed email gifted when there is no invitation", () => {
    expect(billingAtSignup({ grant: null, compPlan: "studio", now })).toEqual({
      plan: "studio",
      comped: true,
      testerUntil: null,
      discountPercent: null,
    });
  });
});
