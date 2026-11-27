import { describe, expect, it } from "vitest";
import { VENDOR_CATEGORIES, categoryLabel, isMusicKind, isVendorCategory, musicKindLabel } from "./categories";

describe("categories", () => {
  it("labels every category with the Mariages.net name", () => {
    expect(categoryLabel("venue")).toBe("Lieux de réception");
    expect(categoryLabel("caterer")).toBe("Traiteur");
    expect(categoryLabel("dj")).toBe("Musique");
    expect(categoryLabel("decor")).toBe("Déco et location de matériel");
    expect(categoryLabel("beauty")).toBe("Coiffure et maquillage");
    for (const category of VENDOR_CATEGORIES) {
      expect(categoryLabel(category).length).toBeGreaterThan(1);
    }
  });

  it("keeps a music type the vendor can choose", () => {
    expect(isMusicKind("orchestra")).toBe(true);
    expect(musicKindLabel("choir")).toBe("Chorale");
    expect(isVendorCategory("band")).toBe(false);
  });
});
