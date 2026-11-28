import { describe, expect, it } from "vitest";
import { VENDOR_CATEGORIES, categoryLabel, isMusicKind, isVendorCategory, musicKindLabel } from "./categories";

describe("categories", () => {
  it("names the person or the trade, in French", () => {
    expect(categoryLabel("venue")).toBe("Lieu de réception");
    expect(categoryLabel("caterer")).toBe("Traiteur");
    expect(categoryLabel("cake")).toBe("Pâtissier");
    expect(categoryLabel("wine")).toBe("Caviste");
    expect(categoryLabel("photographer")).toBe("Photographe");
    expect(categoryLabel("dj")).toBe("DJ / Musicien");
    expect(categoryLabel("decor")).toBe("Décorateur");
    expect(categoryLabel("hair")).toBe("Coiffeur");
    expect(categoryLabel("makeup")).toBe("Maquilleur");
    expect(categoryLabel("attire")).toBe("Créateur de robes et costumes");
    expect(categoryLabel("stationery")).toBe("Papetier");
    expect(categoryLabel("transport")).toBe("Transport avec chauffeur");
    expect(categoryLabel("beauty")).toBe("Coiffeur et maquilleur");
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
