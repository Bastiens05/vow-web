import { describe, expect, it } from "vitest";
import { leadStatusLabel, splitCoupleNames } from "./leads";

describe("splitCoupleNames", () => {
  it("splits a couple written with et or &", () => {
    expect(splitCoupleNames("Marie et Marc")).toEqual({ one: "Marie", oneLast: "", two: "Marc", twoLast: "" });
    expect(splitCoupleNames("Léa & Hugo")).toEqual({ one: "Léa", oneLast: "", two: "Hugo", twoLast: "" });
    expect(splitCoupleNames("Léa Martin & Hugo Bernard")).toEqual({
      one: "Léa",
      oneLast: "Martin",
      two: "Hugo",
      twoLast: "Bernard",
    });
  });

  it("keeps a single name usable for a wedding", () => {
    expect(splitCoupleNames("Camille")).toEqual({ one: "Camille", oneLast: "", two: "À venir", twoLast: "" });
  });
});

describe("leadStatusLabel", () => {
  it("labels the pipeline in french", () => {
    expect(leadStatusLabel("nouvelle")).toBe("Nouvelle");
    expect(leadStatusLabel("gagnee")).toBe("Gagnée");
  });
});
