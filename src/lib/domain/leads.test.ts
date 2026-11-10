import { describe, expect, it } from "vitest";
import { leadStatusLabel, splitCoupleNames } from "./leads";

describe("splitCoupleNames", () => {
  it("splits a couple written with et or &", () => {
    expect(splitCoupleNames("Marie et Marc")).toEqual({ one: "Marie", two: "Marc" });
    expect(splitCoupleNames("Léa & Hugo")).toEqual({ one: "Léa", two: "Hugo" });
  });

  it("keeps a single name usable for a wedding", () => {
    expect(splitCoupleNames("Camille")).toEqual({ one: "Camille", two: "À venir" });
  });
});

describe("leadStatusLabel", () => {
  it("labels the pipeline in french", () => {
    expect(leadStatusLabel("nouvelle")).toBe("Nouvelle");
    expect(leadStatusLabel("gagnee")).toBe("Gagnée");
  });
});
