import { describe, expect, it } from "vitest";
import { countdownLabel, coupleNextActions, daysUntil } from "./next-actions";

describe("daysUntil", () => {
  it("counts whole days until the wedding", () => {
    expect(daysUntil("2027-06-19", "2026-11-10")).toBe(221);
    expect(countdownLabel(0)).toBe("C'est aujourd'hui");
    expect(countdownLabel(12)).toBe("J-12");
  });
});

describe("coupleNextActions", () => {
  it("puts a pending signature first and keeps three actions", () => {
    const actions = coupleNextActions({
      weddingId: "w1",
      hasPractical: false,
      needsPhotos: true,
      hasPhotos: false,
      needsGuests: true,
      hasGuests: false,
      hasTimeline: false,
      pendingSignature: true,
      hasDocument: false,
    });
    expect(actions.map((action) => action.id)).toEqual(["signature", "practical", "photos"]);
    expect(actions[0]?.href).toBe("/mariage/w1/documents");
  });

  it("skips photo groups when no photographer is on the wedding", () => {
    const actions = coupleNextActions({
      weddingId: "w1",
      hasPractical: true,
      needsPhotos: false,
      hasPhotos: false,
      needsGuests: false,
      hasGuests: false,
      hasTimeline: true,
      pendingSignature: false,
      hasDocument: true,
    });
    expect(actions).toEqual([]);
  });
});
