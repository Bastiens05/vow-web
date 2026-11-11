import { describe, expect, it } from "vitest";
import { canInviteMembers, canManageTimeline, partitionWeddings, weddingStatus } from "./access";

describe("access", () => {
  it("lets vendors invite and keeps the day programme with the couple", () => {
    expect(canManageTimeline("vendor")).toBe(false);
    expect(canInviteMembers("vendor")).toBe(true);
  });

  it("lets the couple edit the day programme and invite their partner", () => {
    expect(canManageTimeline("couple")).toBe(true);
    expect(canInviteMembers("couple")).toBe(true);
    expect(canManageTimeline(null)).toBe(false);
    expect(canInviteMembers(null)).toBe(false);
  });
});

describe("partitionWeddings", () => {
  const items = [
    { id: "past", weddingDate: "2026-09-05" },
    { id: "soon", weddingDate: "2027-06-19" },
    { id: "later", weddingDate: "2027-09-12" },
    { id: "open", weddingDate: null },
  ];

  it("splits upcoming and past around today", () => {
    const result = partitionWeddings(items, "2026-11-10");
    expect(result.upcoming.map((item) => item.id)).toEqual(["soon", "later", "open"]);
    expect(result.past.map((item) => item.id)).toEqual(["past"]);
  });

  it("keeps a demo wedding after real upcoming dates", () => {
    const result = partitionWeddings(
      [
        { id: "demo", weddingDate: "2027-01-01", isDemo: true },
        { id: "real", weddingDate: "2027-08-01", isDemo: false },
      ],
      "2026-11-10",
    );
    expect(result.upcoming.map((item) => item.id)).toEqual(["real", "demo"]);
  });
});

describe("weddingStatus", () => {
  it("labels real weddings and isolates the demo", () => {
    expect(
      weddingStatus({
        weddingDate: "2027-06-19",
        today: "2026-11-10",
        isDemo: false,
        couplePreview: false,
        coupleJoined: false,
      }),
    ).toBe("À venir · couple en attente");
    expect(
      weddingStatus({
        weddingDate: "2026-01-01",
        today: "2026-11-10",
        isDemo: false,
        couplePreview: false,
        coupleJoined: true,
      }),
    ).toBe("Passé");
    expect(
      weddingStatus({
        weddingDate: "2027-06-19",
        today: "2026-11-10",
        isDemo: true,
        couplePreview: true,
        coupleJoined: false,
      }),
    ).toBe("Démo · essai mariés");
  });
});
