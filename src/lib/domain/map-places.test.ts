import { describe, expect, it } from "vitest";
import { mapPlaces } from "./map-places";

describe("map places", () => {
  it("keeps the ceremony and the reception when they differ, then the extra places", () => {
    expect(
      mapPlaces({
        ceremony: "Mairie de Bordeaux",
        reception: "Château de Léognan",
        stops: [{ label: "Préparatifs", address: "12 rue Sainte-Catherine, Bordeaux" }],
      }),
    ).toEqual([
      { label: "Cérémonie", address: "Mairie de Bordeaux" },
      { label: "Réception", address: "Château de Léognan" },
      { label: "Préparatifs", address: "12 rue Sainte-Catherine, Bordeaux" },
    ]);
  });

  it("does not show the ceremony a second time as the reception", () => {
    expect(
      mapPlaces({
        ceremony: "Mairie de Bordeaux",
        reception: "Mairie de Bordeaux",
        stops: [
          { label: "Cérémonie", address: "mairie de bordeaux" },
          { label: "Photos", address: "Jardin public" },
        ],
      }).map((place) => place.label),
    ).toEqual(["Cérémonie", "Photos"]);
  });
});
