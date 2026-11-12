import { describe, expect, it } from "vitest";
import { buildBriefing } from "./briefing";

const base = {
  names: "Léa et Hugo",
  pronunciation: "Léa, comme léa",
  people: "Les parents, les témoins",
  notes: "La grand-mère entend mal.",
  steps: ["Cérémonie", "Cocktail", "Dîner"],
  address: "Château de Vaux",
  weather: "Ciel couvert, 18 degrés.",
  trade: "photographer",
  heard: false,
};

describe("spoken briefing", () => {
  it("stays on the vendor's own day", () => {
    const text = buildBriefing(base);
    expect(text).toContain("Léa et Hugo");
    expect(text).toContain("Cérémonie, Cocktail, Dîner");
    expect(text).not.toMatch(/budget|devis/i);
  });

  it("opens on the ceremony for an officiant", () => {
    expect(buildBriefing({ ...base, trade: "officiant" })).toContain("cérémonie");
  });
});
