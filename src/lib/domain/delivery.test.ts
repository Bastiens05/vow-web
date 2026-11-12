import { describe, expect, it } from "vitest";
import { atRisk, deliverySteps, promisedDate } from "./delivery";

describe("delivery", () => {
  it("uses a photo pipeline and a default for other trades", () => {
    expect(deliverySteps("photographer").at(-1)).toBe("Livré");
    expect(deliverySteps("florist")).toEqual(["Préparation", "En cours", "Livré"]);
    expect(promisedDate("2027-06-19", 30)).toBe("2027-07-19");
    expect(atRisk("2026-11-01", false, "2026-11-11")).toBe(true);
    expect(atRisk("2026-11-01", true, "2026-11-11")).toBe(false);
  });
});
