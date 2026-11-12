import { describe, expect, it } from "vitest";
import { promoActive, visiblePrice } from "./promo";

const base = {
  priceCents: 240000,
  promoKind: "percent" as const,
  promoValue: 10,
  promoLabel: "",
  promoStartsOn: "2026-11-01",
  promoEndsOn: "2026-12-31",
};

describe("offer promos", () => {
  it("bars the original price while the promo runs", () => {
    const price = visiblePrice(base, "2026-12-01");
    expect(price.originalCents).toBe(240000);
    expect(price.currentCents).toBe(216000);
    expect(price.badge).toBe("−10 % jusqu'au 31 déc");
  });

  it("drops the promo after the end date", () => {
    expect(promoActive(base, "2027-01-01")).toBe(false);
    expect(visiblePrice(base, "2027-01-01")).toEqual({
      originalCents: null,
      currentCents: 240000,
      badge: null,
    });
  });

  it("waits for the start date and accepts a euro amount", () => {
    expect(promoActive(base, "2026-10-01")).toBe(false);
    const price = visiblePrice(
      { ...base, promoKind: "amount", promoValue: 5000, promoLabel: "Lancement", promoEndsOn: null },
      "2026-12-01",
    );
    expect(price.currentCents).toBe(235000);
    expect(price.badge).toContain("Lancement");
    expect(price.badge).toContain("50");
  });
});
