import { describe, expect, it } from "vitest";
import { VENDOR_CATEGORIES } from "./categories";
import { fieldsForTrade, filledRatio, missingQuestions, visibleFacts } from "./profile";

describe("profile", () => {
  it("gives every trade at least the ceremony address", () => {
    for (const category of VENDOR_CATEGORIES) {
      expect(fieldsForTrade(category).some((field) => field.key === "ceremony_address")).toBe(true);
    }
  });

  it("hides diets from the photographer", () => {
    const facts = { diets: "sans gluten", ceremony_address: "Mairie" };
    expect(visibleFacts(facts, "photographer")).toEqual({ ceremony_address: "Mairie" });
    expect(visibleFacts(facts, "caterer").diets).toBe("sans gluten");
  });

  it("counts only the fields of that trade", () => {
    const ratio = filledRatio({ ceremony_address: "Mairie", diets: "vegan" }, "dj");
    expect(ratio.total).toBe(fieldsForTrade("dj").length);
    expect(ratio.percent).toBeGreaterThan(0);
    expect(ratio.percent).toBeLessThan(100);
  });

  it("does not ask again for a fact already written", () => {
    const rows = missingQuestions(["À quelle heure commence la cérémonie ?", "Qui doit absolument être sur les photos de groupe ?"], {
      ceremony_time: "16:00",
    });
    expect(rows[0]?.known).toBe("16:00");
    expect(rows[1]?.known).toBeNull();
  });
});
