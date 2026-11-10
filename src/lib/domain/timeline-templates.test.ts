import { describe, expect, it } from "vitest";
import { builtinTemplate, suggestedTemplateId } from "./timeline-templates";

describe("timeline templates", () => {
  it("suggests the trade template and falls back to the general day", () => {
    expect(suggestedTemplateId("photographer")).toBe("photographer");
    expect(suggestedTemplateId("caterer")).toBe("caterer");
    expect(suggestedTemplateId(null)).toBe("general");
    expect(builtinTemplate("general")?.slots[1]?.title).toBe("Accueil des invités");
    expect(builtinTemplate("dj")?.label).toBe("DJ");
  });
});
