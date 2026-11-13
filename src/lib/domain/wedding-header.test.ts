import { describe, expect, it } from "vitest";
import { weddingHeaderMode, weddingHomeLink } from "./wedding-header";

const id = "63f7ccb4-0000-4000-8000-000000000001";

describe("en-tête du mariage", () => {
  it("montre la photo sur l'accueil, même en arrivant depuis les invitations", () => {
    expect(weddingHeaderMode(`/mariage/${id}/inviter`, id)).toBe("title");
    expect(weddingHeaderMode(`/mariage/${id}`, id)).toBe("hero");
  });

  it("donne un retour vers l'accueil sur chaque sous-page, pas sur l'accueil lui-même", () => {
    expect(weddingHomeLink(`/mariage/${id}`, id)).toBeNull();
    for (const section of ["devis", "budget", "inviter", "bulles", "brief", "jour", "pratique", "documents", "messages"]) {
      expect(weddingHomeLink(`/mariage/${id}/${section}`, id)).toBe(`/mariage/${id}`);
    }
    expect(weddingHomeLink(`/mariage/${id}/bulle/vendor`, id)).toBe(`/mariage/${id}`);
  });

  it("laisse Messages sans l'en-tête de l'accueil", () => {
    expect(weddingHeaderMode(`/mariage/${id}/messages`, id)).toBe("thread");
    expect(weddingHeaderMode(`/mariage/${id}/messages?avec=1`, id)).toBe("thread");
  });
});
