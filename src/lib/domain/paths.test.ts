import { describe, expect, it } from "vitest";
import { invitationPath, isProtectedPath, safeNextPath } from "./paths";

describe("safeNextPath", () => {
  it("keeps internal paths", () => {
    expect(safeNextPath("/invitation/abc")).toBe("/invitation/abc");
  });

  it("rejects open redirects", () => {
    expect(safeNextPath("https://evil.example")).toBe("/espace");
    expect(safeNextPath("//evil.example")).toBe("/espace");
    expect(safeNextPath("/\\evil")).toBe("/espace");
  });

  it("uses the fallback for empty values", () => {
    expect(safeNextPath(null, "/connexion")).toBe("/connexion");
  });
});

describe("routes", () => {
  it("builds the invitation path", () => {
    expect(invitationPath("abc")).toBe("/invitation/abc");
  });

  it("protects member areas only", () => {
    expect(isProtectedPath("/espace/profil")).toBe(true);
    expect(isProtectedPath("/mariage/1/messages")).toBe(true);
    expect(isProtectedPath("/p/atelier-lumiere")).toBe(false);
    expect(isProtectedPath("/connexion")).toBe(false);
    expect(isProtectedPath("/invitation/abc")).toBe(false);
  });
});
