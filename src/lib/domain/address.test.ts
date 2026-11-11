import { describe, expect, it } from "vitest";
import { suggestionsFromBan } from "./address";

describe("suggestionsFromBan", () => {
  it("reads street, postcode, city and coordinates from a BAN feature", () => {
    const suggestions = suggestionsFromBan({
      features: [
        {
          properties: { label: "8 Boulevard du Port 80000 Amiens", name: "8 Boulevard du Port", postcode: "80000", city: "Amiens" },
          geometry: { coordinates: [2.3, 49.89] },
        },
        { properties: { label: "incomplet" } },
      ],
    });
    expect(suggestions).toEqual([
      {
        label: "8 Boulevard du Port 80000 Amiens",
        street: "8 Boulevard du Port",
        postcode: "80000",
        city: "Amiens",
        longitude: 2.3,
        latitude: 49.89,
      },
    ]);
  });

  it("returns nothing when the payload has no features", () => {
    expect(suggestionsFromBan(null)).toEqual([]);
  });
});
