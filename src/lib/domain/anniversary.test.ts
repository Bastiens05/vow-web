import { describe, expect, it } from "vitest";
import { canSend, offerDate, renderOffer } from "./anniversary";

describe("anniversary offers", () => {
  it("fills the three variables", () => {
    expect(renderOffer("Bonjour {prenoms}, le {date_mariage} à {lieu}.", { prenoms: "Léa et Hugo", date: "19 juin 2027", lieu: "Vaux" })).toBe(
      "Bonjour Léa et Hugo, le 19 juin 2027 à Vaux.",
    );
  });

  it("waits for a review when the template asks for one", () => {
    expect(canSend({ enabled: false, require_review: true }, "approved")).toBe(false);
    expect(canSend({ enabled: true, require_review: true }, "queued")).toBe(false);
    expect(canSend({ enabled: true, require_review: true }, "approved")).toBe(true);
  });

  it("places the offer a year after the wedding", () => {
    expect(offerDate("2027-06-19", 12)).toBe("2028-06-19");
  });
});
