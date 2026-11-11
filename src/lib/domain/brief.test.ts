import { describe, expect, it } from "vitest";
import { briefText, buildDayBrief } from "./brief";

describe("day brief", () => {
  it("keeps only this vendor's steps and a map link", () => {
    const brief = buildDayBrief({
      couple: "Léa & Hugo",
      date: "19 juin 2027",
      steps: [{ time: "16h00", title: "Cérémonie", place: "Mairie de Léognan" }],
      facts: [{ label: "Adultes", value: "80" }, { label: "Régimes", value: "" }],
    });
    expect(brief.steps[0]?.map).toContain("google.com/maps");
    expect(brief.facts).toEqual([{ label: "Adultes", value: "80" }]);
    expect(briefText(brief)).toContain("Cérémonie");
    expect(briefText(brief)).not.toContain("Régimes");
  });
});
