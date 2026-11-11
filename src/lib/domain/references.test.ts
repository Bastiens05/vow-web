import { describe, expect, it } from "vitest";
import { publicCoupleName, venueAggregate } from "./references";

describe("proven references", () => {
  it("hides the couple name unless they chose one", () => {
    expect(publicCoupleName(null)).toBe("Un couple");
    expect(publicCoupleName("Léa et Hugo")).toBe("Léa et Hugo");
  });

  it("counts weddings at the same venue", () => {
    expect(venueAggregate([{ venue_name: "Château X" }, { venue_name: "Château X" }])).toEqual([
      { venue: "Château X", count: 2 },
    ]);
  });
});
