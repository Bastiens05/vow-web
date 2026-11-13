import { describe, expect, it } from "vitest";
import { canDeliver, canSeeSheet, offerExample, pratiqueLabel, sheetsFor } from "./trades";

describe("sheetsFor", () => {
  it("gives the couple every sheet", () => {
    expect(sheetsFor("couple", null)).toEqual(["practical", "photos", "guests", "music"]);
  });

  it("gives the photographer groups, not guests", () => {
    expect(canSeeSheet("vendor", "photographer", "photos")).toBe(true);
    expect(canSeeSheet("vendor", "photographer", "guests")).toBe(false);
    expect(canSeeSheet("vendor", "videographer", "photos")).toBe(true);
  });

  it("gives the caterer and the venue the guest list, not group photos", () => {
    expect(canSeeSheet("vendor", "caterer", "guests")).toBe(true);
    expect(canSeeSheet("vendor", "caterer", "photos")).toBe(false);
    expect(canSeeSheet("vendor", "venue", "guests")).toBe(true);
  });

  it("keeps the gallery to the couple and the photo trades", () => {
    expect(canDeliver("couple", null)).toBe(true);
    expect(canDeliver("vendor", "photographer")).toBe(true);
    expect(canDeliver("vendor", "videographer")).toBe(true);
    expect(canDeliver("vendor", "caterer")).toBe(false);
    expect(canDeliver("vendor", "planner")).toBe(false);
  });

  it("lets the planner see everything and the DJ only the addresses", () => {
    expect(sheetsFor("vendor", "planner")).toEqual(["practical", "photos", "guests", "music"]);
    expect(sheetsFor("vendor", "dj")).toEqual(["practical", "music"]);
    expect(canSeeSheet("vendor", "florist", "music")).toBe(false);
    expect(canSeeSheet("vendor", "florist", "photos")).toBe(false);
  });
});

describe("offer examples", () => {
  it("follows the trade and never invents a price", () => {
    expect(offerExample("dj")).toBe("Animation soirée");
    expect(offerExample("caterer")).toBe("Repas");
    expect(offerExample(null)).toBe("Prestation");
    expect(offerExample("florist")).not.toBe("Reportage journée");
  });
});

describe("pratiqueLabel", () => {
  it("names the tab after the trade", () => {
    expect(pratiqueLabel("vendor", "photographer")).toBe("Groupes");
    expect(pratiqueLabel("vendor", "caterer")).toBe("Invités");
    expect(pratiqueLabel("vendor", "dj")).toBe("Musique");
    expect(pratiqueLabel("couple", null)).toBe("Pratique");
  });
});
