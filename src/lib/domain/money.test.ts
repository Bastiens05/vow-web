import { describe, expect, it } from "vitest";
import { documentNumber, eurosToCents, formatEuros, textPdf } from "./money";

describe("money", () => {
  it("numbers documents per vendor and reads euros", () => {
    expect(documentNumber("D", 2026, 4)).toBe("D-2026-004");
    expect(eurosToCents("1 250,50")).toBe(125050);
    expect(formatEuros(150000)).toContain("1");
  });

  it("builds a pdf", () => {
    expect(new TextDecoder().decode(textPdf(["Devis D-2026-001"])).startsWith("%PDF-1.4")).toBe(true);
  });
});
