import { describe, expect, it } from "vitest";
import { canSeeSheet, pratiqueLabel, sheetsFor } from "./trades";

describe("sheetsFor", () => {
  it("gives the couple every sheet", () => {
    expect(sheetsFor("couple", null)).toEqual(["practical", "photos", "guests"]);
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

  it("lets the planner see everything and the DJ only the addresses", () => {
    expect(sheetsFor("vendor", "planner")).toEqual(["practical", "photos", "guests"]);
    expect(sheetsFor("vendor", "dj")).toEqual(["practical"]);
  });
});

describe("pratiqueLabel", () => {
  it("names the tab after the trade", () => {
    expect(pratiqueLabel("vendor", "photographer")).toBe("Groupes");
    expect(pratiqueLabel("vendor", "caterer")).toBe("Invités");
    expect(pratiqueLabel("vendor", "dj")).toBe("Infos");
    expect(pratiqueLabel("couple", null)).toBe("Pratique");
  });
});
