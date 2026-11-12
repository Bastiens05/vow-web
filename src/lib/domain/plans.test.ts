import { describe, expect, it } from "vitest";
import { PLAN_OFFERS, coupleIsFree, featurePlanLabel, featuresIncludedIn, featuresIntroducedIn, hasFeature, planIncludes, planLabel, testerInviteHref, testerOfferLabel } from "./plans";

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
  });

  it("formats the tester offer and invite link", () => {
    expect(testerOfferLabel("2027-11-12T11:00:00.000Z", 30)).toBe(
      "Offre testeur : gratuit jusqu'au 12/11/2027, puis -30 %",
    );
    expect(testerInviteHref("alex@example.com", "tok-1")).toBe(
      "/inscription?role=vendor&email=alex%40example.com&invite=tok-1",
    );
  });

});
