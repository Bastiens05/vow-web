import { describe, expect, it } from "vitest";
import {
  ASSISTANT_LIMIT,
  ASSISTANT_UNAVAILABLE,
  assistantFailureMessage,
  assistantToolNames,
  coupleRemaining,
  parseProgrammeSlots,
  splitBudget,
} from "./assistant";

describe("splitBudget", () => {
  it("keeps the French shares and the whole total", () => {
    const lines = splitBudget(1_000_000);
    expect(lines.reduce((sum, line) => sum + line.percent, 0)).toBe(100);
    expect(lines.reduce((sum, line) => sum + line.cents, 0)).toBe(1_000_000);
    expect(lines[0]).toMatchObject({ label: "Lieu et traiteur", percent: 45, cents: 450_000 });
  });
});

describe("parseProgrammeSlots", () => {
  it("accepts a short day and rejects a loose time", () => {
    expect(
      parseProgrammeSlots([
        { title: "Cérémonie", startsAt: "16:00", place: "Jardin" },
        { title: "Dîner", startsAt: "20:00:00", place: "" },
      ]),
    ).toEqual([
      { title: "Cérémonie", startsAt: "16:00", place: "Jardin", notes: "" },
      { title: "Dîner", startsAt: "20:00", place: "", notes: "" },
    ]);
    expect(parseProgrammeSlots([{ title: "Cérémonie", startsAt: "soir", place: "" }])).toBeNull();
  });
});

describe("assistantFailureMessage", () => {
  it("uses the calm sentence when the gateway cannot answer", () => {
    expect(assistantFailureMessage(new Error("Insufficient credits"))).toBe(ASSISTANT_UNAVAILABLE);
    expect(assistantFailureMessage(new Error("402"))).toBe(ASSISTANT_UNAVAILABLE);
    expect(assistantFailureMessage(new Error(ASSISTANT_LIMIT))).toBe(ASSISTANT_LIMIT);
  });
});

describe("assistant access", () => {
  it("keeps the budget tool on the couple side only", () => {
    expect(assistantToolNames("couple")).toContain("suggestBudget");
    expect(assistantToolNames("vendor")).not.toContain("suggestBudget");
    expect(assistantToolNames("vendor")).toEqual(["summarizeWedding", "draftReply", "suggestChecklist"]);
  });

  it("lists every open couple task", () => {
    const items = coupleRemaining({
      weddingId: "w1",
      hasPractical: true,
      needsPhotos: true,
      hasPhotos: false,
      needsGuests: false,
      hasGuests: false,
      hasTimeline: false,
      pendingSignature: false,
      hasDocument: true,
      hasVault: false,
    });
    expect(items.map((item) => item.id)).toEqual(["photos", "timeline", "vault"]);
  });
});
