import { describe, expect, it } from "vitest";
import { matchesVendorSearch, vendorSearchQuery } from "./vendor-search";

const studio = {
  businessName: "Atelier Lumière",
  personName: "Camille Martin",
  category: "photographer",
  discoverable: true,
};

describe("vendor search", () => {
  it("matches the business name or the person's name", () => {
    expect(matchesVendorSearch(studio, "lumière", "")).toBe(true);
    expect(matchesVendorSearch(studio, "camille", "")).toBe(true);
    expect(matchesVendorSearch(studio, "traiteur", "")).toBe(false);
  });

  it("keeps a vendor out until they choose to appear", () => {
    expect(matchesVendorSearch({ ...studio, discoverable: false }, "camille", "")).toBe(false);
  });

  it("filters by trade", () => {
    expect(matchesVendorSearch(studio, "", "photographer")).toBe(true);
    expect(matchesVendorSearch(studio, "camille", "florist")).toBe(false);
  });

  it("does not let a percent sign widen the query", () => {
    expect(vendorSearchQuery("  %camille_ ")).toBe("camille");
  });
});
