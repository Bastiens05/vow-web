import { describe, expect, it } from "vitest";
import { navigationItems, vendorWeddingSection } from "./navigation-items";

const weddingId = "ac7f5c8d-4d7a-42ff-ae97-66f51f135cba";

describe("navigation prestataire", () => {
  it("garde la navigation globale sur l'accueil et la liste des mariages", () => {
    const expected = ["Accueil", "Mariages", "Messages", "Réglages"];
    expect(navigationItems("/espace", "vendor", "photographer", true, weddingId, false, false).map((item) => item.label)).toEqual(expected);
    expect(navigationItems("/mariages", "vendor", "photographer", true, weddingId, false, false).map((item) => item.label)).toEqual(expected);
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
  });
});
