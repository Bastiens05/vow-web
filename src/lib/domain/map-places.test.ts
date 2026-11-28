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

  it("keeps each moment when the ceremony and the reception share an address", () => {
    expect(
      mapPlaces({
        ceremony: "Mairie de Bordeaux",
        reception: "Mairie de Bordeaux",
        stops: [
          { label: "Cérémonie", address: "mairie de bordeaux" },
          { label: "Vin d'honneur", address: "Mairie de Bordeaux" },
          { label: "Dessert", address: "Mairie de Bordeaux" },
          { label: "Photos", address: "Jardin public" },
        ],
      }).map((place) => place.label),
    ).toEqual(["Cérémonie", "Réception", "Vin d'honneur", "Dessert", "Photos"]);
  });

  it("orders Pratique and the extra places by time", () => {
    expect(
      mapPlaces({
        ceremony: "Mairie de Bordeaux",
        ceremonyTime: "15:00",
        reception: "Château de Léognan",
        receptionTime: "19h00",
        stops: [{ label: "Préparatifs", address: "12 rue Sainte-Catherine, Bordeaux", time: "10:00" }],
      }).map((place) => place.label),
    ).toEqual(["Préparatifs", "Cérémonie", "Réception"]);
  });

  it("hides a manual réception when Pratique already has one, even at another address", () => {
    expect(
      mapPlaces({
        ceremony: "Mairie de Bordeaux",
        reception: "Château de Léognan",
        stops: [{ label: "Réception", address: "Autre salle" }],
      }).map((place) => place.label),
    ).toEqual(["Cérémonie", "Réception"]);
  });
});
