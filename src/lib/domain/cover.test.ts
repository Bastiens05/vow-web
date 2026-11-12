import { describe, expect, it } from "vitest";
import { isOwnCoverPath } from "@/lib/domain/cover";

const wedding = "ac7f5c8d-4d7a-42ff-ae97-66f51f135cba";
const user = "b1111111-1111-4111-8111-111111111111";

describe("photo de couverture", () => {
  it("accepte le fichier déposé par le membre dans son dossier", () => {
    expect(isOwnCoverPath(wedding, user, `${wedding}/${user}/cover-8f3a.jpg`)).toBe(true);
  });

  it("refuse le fichier d'un autre membre ou un chemin libre", () => {
    expect(isOwnCoverPath(wedding, user, `${wedding}/c2222222-2222-4222-8222-222222222222/cover-8f3a.jpg`)).toBe(false);
    expect(isOwnCoverPath(wedding, user, `${wedding}/${user}/contrat.pdf`)).toBe(false);
    expect(isOwnCoverPath(wedding, user, "../secret")).toBe(false);
  });
});
