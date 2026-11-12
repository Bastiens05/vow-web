import { describe, expect, it } from "vitest";
import { navigationItems } from "./navigation-items";

describe("navigation prestataire", () => {
  const items = navigationItems("/espace", "vendor", "photographer", true, null, false, false);

  it("retire Demandes et Abonnement du menu principal", () => {
    expect(items.map((item) => item.label)).toEqual(["Accueil", "Mariages", "Messages", "Réglages"]);
  });

  it("laisse Admin hors du menu principal, pour le bas de menu", () => {
    const admin = navigationItems("/espace", "vendor", "photographer", true, null, false, true);
    expect(admin.map((item) => item.label)).toContain("Admin");
    expect(admin.map((item) => item.label)).not.toContain("Abonnement");
    expect(admin.map((item) => item.label)).not.toContain("Demandes");
    expect(admin.map((item) => item.label)).not.toContain("Nouveautés");
  });

  it("place Admin en bas du menu d'un mariage", () => {
    const wedding = navigationItems(
      "/mariage/ac7f5c8d-4d7a-42ff-ae97-66f51f135cba",
      "vendor",
      "photographer",
      true,
      "ac7f5c8d-4d7a-42ff-ae97-66f51f135cba",
      false,
      true,
    );
    expect(wedding.at(-1)).toEqual({ href: "/admin", label: "Admin", icon: "gear" });
    expect(wedding.map((item) => item.label)).not.toContain("Nouveautés");
    expect(wedding.map((item) => item.label)).not.toContain("Aperçu");
    expect(wedding[0]?.label).toBe("Messages");
  });
});
