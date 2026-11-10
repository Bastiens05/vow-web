import { describe, expect, it } from "vitest";
import { formatPriceCents, parseEurosToCents } from "./price";

describe("parseEurosToCents", () => {
  it("accepts an empty price", () => {
    expect(parseEurosToCents("  ")).toEqual({ ok: true, cents: null });
  });

  it("parses french decimals", () => {
    expect(parseEurosToCents("1 200,50")).toEqual({ ok: true, cents: 120050 });
  });

  it("rejects letters", () => {
    expect(parseEurosToCents("gratuit").ok).toBe(false);
  });
});

describe("formatPriceCents", () => {
  it("formats whole euros without cents", () => {
    expect(formatPriceCents(240000)).toBe("2\u202f400\u00a0€");
  });

  it("keeps cents when needed", () => {
    expect(formatPriceCents(35050)).toBe("350,50\u00a0€");
  });
});
