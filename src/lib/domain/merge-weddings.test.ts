import { describe, expect, it } from "vitest";
import { chooseKeptWedding, messageNotice } from "@/lib/domain/merge-weddings";

const couple = "3bc70cb8-4d7a-42f1-aef7-d95f7375133d";
const vendor = "ac7f5c8d-4d7a-42ff-ae97-66f51f135cba";

describe("chooseKeptWedding", () => {
  it("keeps the wedding the couple already has", () => {
    expect(
      chooseKeptWedding(
        { id: couple, createdAt: "2026-06-01T00:00:00Z", hasCouple: true },
        { id: vendor, createdAt: "2026-01-01T00:00:00Z", hasCouple: false },
      ),
    ).toEqual({ keep: couple, drop: vendor });
  });

  it("keeps the older wedding when both already have the couple", () => {
    expect(
      chooseKeptWedding(
        { id: vendor, createdAt: "2026-06-01T00:00:00Z", hasCouple: true },
        { id: couple, createdAt: "2026-01-01T00:00:00Z", hasCouple: true },
      ),
    ).toEqual({ keep: couple, drop: vendor });
  });
});

describe("messageNotice", () => {
  it("names the sender and stays short", () => {
    expect(messageNotice("Camille", "On arrive à 16 h")).toBe("Camille : On arrive à 16 h");
    expect(messageNotice("  ", "Bonjour")).toBe("Quelqu'un : Bonjour");
    expect(messageNotice("Camille", "x".repeat(200)).length).toBe(180);
  });
});
