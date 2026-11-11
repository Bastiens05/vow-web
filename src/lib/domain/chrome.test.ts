import { describe, expect, it } from "vitest";
import { backTarget, isPublicPath, isTopLevelPath } from "./chrome";

describe("isPublicPath", () => {
  it("keeps marketing, auth, showcase and quote requests public", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/connexion")).toBe(true);
    expect(isPublicPath("/inscription")).toBe(true);
    expect(isPublicPath("/demande/atelier-lumiere")).toBe(true);
    expect(isPublicPath("/p/atelier-lumiere")).toBe(true);
    expect(isPublicPath("/espace")).toBe(false);
    expect(isPublicPath("/mariages")).toBe(false);
  });
});

describe("backTarget", () => {
  it("gives top-level tabs no back link, including the weddings list", () => {
    for (const path of ["/espace", "/mariages", "/demandes", "/alertes", "/reglages"]) {
      expect(backTarget(path, "vendor", false)).toBeNull();
      expect(isTopLevelPath(path)).toBe(true);
    }
  });

  it("sends a wedding back to the list, and a sheet back to the wedding", () => {
    expect(backTarget("/mariage/abc", "vendor", false)).toEqual({ label: "Mariages", href: "/mariages" });
    expect(backTarget("/mariage/abc", "couple", true)).toEqual({ label: "Accueil", href: "/espace" });
    expect(backTarget("/mariage/abc/devis", "vendor", false)).toEqual({ label: "Aperçu", href: "/mariage/abc" });
    expect(backTarget("/mariage/abc/devis", "vendor", false)?.href).not.toBe("/mariage/abc/devis");
  });
});
