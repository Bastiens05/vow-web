import { describe, expect, it } from "vitest";
import { navigationItems } from "./navigation-items";

const weddingId = "ac7f5c8d-4d7a-42ff-ae97-66f51f135cba";

describe("navigation prestataire", () => {
  it("garde la navigation globale sur l'accueil et la liste des mariages", () => {
    const expected = ["Accueil", "Mariages", "Demandes", "Messages", "Nouveautés", "Abonnement", "Réglages"];
    expect(navigationItems("/espace", "vendor", "photographer", true, weddingId, false, false).map((item) => item.label)).toEqual(expected);
    expect(navigationItems("/mariages", "vendor", "photographer", true, weddingId, false, false).map((item) => item.label)).toEqual(expected);
  });

  it("n'ouvre pas le menu d'un mariage depuis /mariages", () => {
    const labels = navigationItems("/mariages", "vendor", "photographer", true, weddingId, false, false).map((item) => item.label);
    expect(labels).not.toContain("Aperçu");
    expect(labels).not.toContain("Jour J");
    expect(labels).not.toContain("Invitations");
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
