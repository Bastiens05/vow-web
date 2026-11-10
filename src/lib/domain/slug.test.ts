import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("folds accents and spaces", () => {
    expect(slugify("Atelier Lumière")).toBe("atelier-lumiere");
  });

  it("drops punctuation and trims hyphens", () => {
    expect(slugify("  L'Orangerie — Bordeaux! ")).toBe("l-orangerie-bordeaux");
  });

  it("falls back when the name has no latin letters", () => {
    expect(slugify("***")).toBe("prestataire");
  });

  it("caps the length", () => {
    expect(slugify("a".repeat(80)).length).toBeLessThanOrEqual(60);
  });
});
