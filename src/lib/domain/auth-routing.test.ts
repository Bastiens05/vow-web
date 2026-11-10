import { describe, expect, it } from "vitest";
import { isValidEmail, landingFor, showSpaceSwitcher } from "./auth-routing";

describe("isValidEmail", () => {
  it("accepts a normal address and rejects a fragment", () => {
    expect(isValidEmail("lea@vow.test")).toBe(true);
    expect(isValidEmail("lea")).toBe(false);
  });
});

describe("landingFor", () => {
  it("sends a vendor home and a couple into the wedding", () => {
    expect(
      landingFor({
        role: "vendor",
        hasVendorProfile: true,
        weddingId: null,
        hasCoupleMembership: false,
        lastSpace: null,
        nextPath: "/espace",
        onboard: false,
      }),
    ).toBe("/espace");
    expect(
      landingFor({
        role: "couple",
        hasVendorProfile: false,
        weddingId: "w1",
        hasCoupleMembership: true,
        lastSpace: null,
        nextPath: "/espace",
        onboard: false,
      }),
    ).toBe("/mariage/w1");
  });

  it("keeps an invitation ahead of the home, and resumes the last space when both exist", () => {
    expect(
      landingFor({
        role: "couple",
        hasVendorProfile: false,
        weddingId: "w1",
        hasCoupleMembership: true,
        lastSpace: null,
        nextPath: "/invitation/abc",
        onboard: false,
      }),
    ).toBe("/invitation/abc");
    expect(
      landingFor({
        role: "vendor",
        hasVendorProfile: true,
        weddingId: "w1",
        hasCoupleMembership: true,
        lastSpace: "couple",
        nextPath: "/espace",
        onboard: false,
      }),
    ).toBe("/mariage/w1");
    expect(
      landingFor({
        role: "vendor",
        hasVendorProfile: false,
        weddingId: null,
        hasCoupleMembership: false,
        lastSpace: null,
        nextPath: "/espace",
        onboard: true,
      }),
    ).toBe("/bienvenue");
  });
});

describe("showSpaceSwitcher", () => {
  it("appears only when both spaces exist", () => {
    expect(showSpaceSwitcher({ hasVendorSpace: true, hasCoupleSpace: true })).toBe(true);
    expect(showSpaceSwitcher({ hasVendorSpace: true, hasCoupleSpace: false })).toBe(false);
  });
});
