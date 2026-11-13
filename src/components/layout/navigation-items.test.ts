import { describe, expect, it } from "vitest";
import { navigationItems, vendorSpaceMenuLabels, vendorWeddingSection } from "./navigation-items";

const weddingId = "ac7f5c8d-4d7a-42ff-ae97-66f51f135cba";

describe("navigation prestataire", () => {
  it("garde la navigation globale sur l'accueil et la liste des mariages", () => {
    const expected = ["Accueil", "Mariages", "Messages", "Paiements", "Réglages"];
    expect(navigationItems("/espace", "vendor", "photographer", true, weddingId, false, false).map((item) => item.label)).toEqual(expected);
    expect(navigationItems("/mariages", "vendor", "photographer", true, weddingId, false, false).map((item) => item.label)).toEqual(expected);
    expect(navigationItems("/espace", "vendor", "photographer", true, weddingId, false, false).find((item) => item.label === "Paiements")?.href).toBe("/tresorerie");
    expect(navigationItems("/espace", "vendor", "dj", true, weddingId, false, false).map((item) => item.label)).toEqual(expected);
    expect(navigationItems("/espace", "vendor", "caterer", true, weddingId, false, false).map((item) => item.label)).toEqual(expected);
    expect(navigationItems("/espace", "vendor", null, true, weddingId, false, false).map((item) => item.label)).toEqual(expected);
    expect(vendorSpaceMenuLabels).toEqual(["Mariages", "Messages", "Paiements"]);
  });

  it("n'ouvre pas le menu d'un mariage depuis /mariages", () => {
    const labels = navigationItems("/mariages", "vendor", "photographer", true, weddingId, false, false).map((item) => item.label);
    expect(labels).not.toContain("Aperçu");
    expect(labels).not.toContain("Jour J");
    expect(labels).not.toContain("Invitations");
    expect(labels).not.toContain("Demandes");
    expect(labels).not.toContain("Nouveautés");
    expect(labels).not.toContain("Abonnement");
  });

  it("n'affiche le mariage ouvert que dans une route /mariage/<id>", () => {
    const names = { [weddingId]: "Mariage de Bastien et Lorène" };
    expect(vendorWeddingSection("/espace", names)).toBeNull();
    expect(vendorWeddingSection("/mariages", names)).toBeNull();
    expect(vendorWeddingSection("/messages", names)).toBeNull();
    expect(vendorWeddingSection("/reglages", names)).toBeNull();
    expect(vendorWeddingSection("/admin", names)).toBeNull();
    expect(vendorWeddingSection("/coffre-fort", names)).toBeNull();
    expect(vendorWeddingSection("/tresorerie", names)).toBeNull();
    expect(vendorWeddingSection("/espace/mariages/nouveau", names)).toBeNull();
    expect(vendorWeddingSection(`/mariage/${weddingId}`, names)).toEqual({
      title: "Mariage de Bastien et Lorène",
      backHref: "/mariages",
      backLabel: "Retour à tous les mariages",
    });
    expect(vendorWeddingSection(`/mariage/${weddingId}/jour`, names)?.title).toBe("Mariage de Bastien et Lorène");
  });

  it("réserve le menu du mariage aux routes /mariage/<id>", () => {
    const wedding = navigationItems(`/mariage/${weddingId}`, "vendor", "photographer", true, weddingId, false, true);
    expect(wedding[0]?.label).toBe("Messages");
    expect(wedding.map((item) => item.label)).toEqual(
      expect.arrayContaining(["Jour J", "Brief", "Documents", "Groupes", "Mon dossier", "Invitations", "Admin"]),
    );
    expect(wedding.map((item) => item.label)).not.toContain("Aperçu");
    expect(wedding.at(-1)).toEqual({ href: "/admin", label: "Admin", icon: "gear" });
    const dj = navigationItems(`/mariage/${weddingId}`, "vendor", "dj", true, weddingId, false, false).map((item) => item.label);
    const caterer = navigationItems(`/mariage/${weddingId}`, "vendor", "caterer", true, weddingId, false, false).map((item) => item.label);
    const florist = navigationItems(`/mariage/${weddingId}`, "vendor", "florist", true, weddingId, false, false).map((item) => item.label);
    expect(dj).toContain("Musique");
    expect(dj).not.toContain("Groupes");
    expect(caterer).toContain("Invités");
    expect(florist).toContain("Infos");
    expect(florist).not.toContain("Groupes");
    expect(florist).not.toContain("Galerie");
  });
});
