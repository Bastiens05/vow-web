import { describe, expect, it } from "vitest";
import { VENDOR_CATEGORIES, categoryLabel, isVendorCategory } from "./categories";

describe("categories", () => {
  it("labels every category in french", () => {
    for (const category of VENDOR_CATEGORIES) {
      expect(categoryLabel(category).length).toBeGreaterThan(1);
    }
  });

  it("rejects unknown categories", () => {
    expect(isVendorCategory("photographer")).toBe(true);
    expect(isVendorCategory("band")).toBe(false);
  });
});
