import { describe, expect, it } from "vitest";
import { builtinTemplate, suggestedTemplateId } from "./timeline-templates";

describe("timeline templates", () => {
  it("suggests a day shape the couple can read", () => {
    expect(suggestedTemplateId("photographer")).toBe("laique");
    expect(suggestedTemplateId("caterer")).toBe("soiree");
    expect(suggestedTemplateId(null)).toBe("laique");
    expect(builtinTemplate("laique")?.label).toBe("Cérémonie laïque + vin d'honneur + dîner");
    expect(builtinTemplate("laique")?.slots.map((slot) => slot.title)).toContain("Vin d'honneur");
    expect(builtinTemplate("soiree")?.slots.at(-1)?.title).toBe("Soirée dansante");
  });
});
