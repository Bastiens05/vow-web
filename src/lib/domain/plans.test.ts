import { describe, expect, it } from "vitest";
import { PLAN_OFFERS, coupleIsFree, discountedMonthlyCents, featurePlanLabel, featuresIncludedIn, featuresIntroducedIn, formatMonthlyEuros, hasFeature, planIncludes, planLabel, testerInviteHref, testerOfferLabel, vendorSignupHref } from "./plans";

describe("plans", () => {
  it("prices Essentiel, Pro and Studio and keeps couples free", () => {
    expect(coupleIsFree()).toBe(true);
    expect(PLAN_OFFERS.map((plan) => plan.cents)).toEqual([2900, 4900, 8900]);
    expect(PLAN_OFFERS[0]?.price).toBe("29 €/mois");
  });

  it("nests Studio inside Pro inside Essentiel", () => {
    expect(planIncludes("studio", "essentiel")).toBe(true);
    expect(planIncludes("pro", "essentiel")).toBe(true);
    expect(planIncludes("essentiel", "pro")).toBe(false);
    expect(hasFeature({ role: "vendor", plan: "essentiel" }, "cashflow")).toBe(false);
    expect(hasFeature({ role: "vendor", plan: "pro" }, "cashflow")).toBe(true);
    expect(hasFeature({ role: "vendor", plan: "pro" }, "crew")).toBe(false);
    expect(hasFeature({ role: "vendor", plan: "studio" }, "crew")).toBe(true);
    expect(hasFeature({ role: "vendor", plan: "studio" }, "speech_subtitles")).toBe(true);
    expect(hasFeature({ role: "couple" }, "guest_live")).toBe(true);
    expect(hasFeature({ role: "vendor", plan: "studio" }, "guest_live")).toBe(false);
    expect(featurePlanLabel("cashflow")).toBe("Pro");
    expect(featurePlanLabel("crew")).toBe("Studio");
  });

  it("lists inclusions from the shared source of truth", () => {
    const essentiel = featuresIntroducedIn("essentiel").map((item) => item.key);
    expect(essentiel).toEqual(["tech_sheet", "delivery", "admin_docs"]);
    expect(featuresIntroducedIn("studio").map((item) => item.key)).toEqual(["crew"]);
    const studio = featuresIncludedIn("studio").map((item) => item.key);
    expect(studio).toContain("tech_sheet");
    expect(studio).toContain("cashflow");
    expect(studio).toContain("crew");
    expect(planLabel("studio", true)).toBe("Studio (offert)");
    expect(planLabel("pro")).toBe("Pro");
    expect(vendorSignupHref("studio")).toBe("/inscription?role=vendor&plan=studio");
  });

  it("formats the tester offer and invite link", () => {
    expect(testerOfferLabel("2027-11-12T11:00:00.000Z", 40)).toBe(
      "Offre testeur : gratuit jusqu'au 12/11/2027, puis -40 % à vie",
    );
    expect(discountedMonthlyCents(2900, 40)).toBe(1740);
    expect(discountedMonthlyCents(4900, 40)).toBe(2940);
    expect(discountedMonthlyCents(8900, 40)).toBe(5340);
    expect(formatMonthlyEuros(1740)).toBe("17,40 €/mois");
    expect(formatMonthlyEuros(2940)).toBe("29,40 €/mois");
    expect(formatMonthlyEuros(5340)).toBe("53,40 €/mois");
    expect(testerInviteHref("alex@example.com", "tok-1")).toBe(
      "/inscription?role=vendor&email=alex%40example.com&invite=tok-1",
    );
  });

});
