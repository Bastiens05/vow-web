import { describe, expect, it } from "vitest";
import { PLAN_OFFERS, coupleIsFree, featurePlanLabel, hasFeature, planIncludes } from "./plans";

describe("plans", () => {
  it("prices Essentiel, Pro and Studio and keeps couples free", () => {
    expect(coupleIsFree()).toBe(true);
    expect(PLAN_OFFERS.map((plan) => plan.cents)).toEqual([2999, 4900, 8900]);
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
});
