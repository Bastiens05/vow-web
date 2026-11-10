import { describe, expect, it } from "vitest";
import {
  isInvitationExpired,
  normalizeEmail,
  validateMessage,
  validateTimelineSlot,
  validateVendorProfile,
  validateWedding,
} from "./validation";

const profileBase = {
  businessName: "Atelier Lumière",
  slug: "",
  category: "photographer",
  city: "Bordeaux",
  zone: "Bassin d'Arcachon",
  description: "Reportage de mariage, lumière naturelle, du matin jusqu'au bout de la nuit.",
  contactEmail: "bonjour@atelier.fr",
  contactPhone: "06 00 00 00 00",
  website: "",
  startingPrice: "350",
  published: true,
};

describe("validateWedding", () => {
  it("trims a complete wedding", () => {
    const result = validateWedding({
      partnerOne: " Léa ",
      partnerTwo: "Hugo",
      weddingDate: "2027-06-19",
      venueName: "Château",
      venueCity: "Léognan",
    });
    expect(result.ok && result.value.partnerOne).toBe("Léa");
  });

  it("requires a real date", () => {
    const result = validateWedding({
      partnerOne: "Léa",
      partnerTwo: "Hugo",
      weddingDate: "juin",
      venueName: "",
      venueCity: "",
    });
    expect(result.ok).toBe(false);
  });
});

describe("validateVendorProfile", () => {
  it("builds a slug from the business name", () => {
    const result = validateVendorProfile(profileBase);
    expect(result.ok && result.value.slug).toBe("atelier-lumiere");
    expect(result.ok && result.value.startingPriceCents).toBe(35000);
  });

  it("refuses to publish a thin description", () => {
    const result = validateVendorProfile({ ...profileBase, description: "Trop court" });
    expect(result.ok).toBe(false);
  });
});

describe("messages and timeline", () => {
  it("rejects an empty message", () => {
    expect(validateMessage("   ").ok).toBe(false);
  });

  it("accepts a slot time", () => {
    const result = validateTimelineSlot({
      title: "Cérémonie",
      startsAt: "16:00",
      place: "Jardin",
      notes: "",
    });
    expect(result.ok).toBe(true);
  });
});

describe("invitations", () => {
  it("normalizes email", () => {
    expect(normalizeEmail("  Lea@Demo.Vow ")).toBe("lea@demo.vow");
  });

  it("detects expiry", () => {
    expect(isInvitationExpired("2026-11-01T00:00:00.000Z", new Date("2026-11-10T00:00:00.000Z"))).toBe(true);
    expect(isInvitationExpired("2026-12-01T00:00:00.000Z", new Date("2026-11-10T00:00:00.000Z"))).toBe(false);
  });
});
