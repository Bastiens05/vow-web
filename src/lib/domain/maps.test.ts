import { describe, expect, it } from "vitest";
import { appleMapsUrl, googleDirectionsUrl, googleMapsUrl } from "./maps";

describe("maps", () => {
  it("builds Google and Apple links from an address", () => {
    expect(googleMapsUrl("Château, Léognan")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Ch%C3%A2teau%2C%20L%C3%A9ognan",
    );
    expect(appleMapsUrl("Château, Léognan")).toBe("https://maps.apple.com/?q=Ch%C3%A2teau%2C%20L%C3%A9ognan");
  });

  it("builds an itinerary between two addresses", () => {
    expect(googleDirectionsUrl("Mairie", "Château")).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=Mairie&destination=Ch%C3%A2teau",
    );
  });
});
