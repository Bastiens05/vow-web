import { describe, expect, it } from "vitest";
import { isWeddingVolume } from "./volume";

describe("isWeddingVolume", () => {
  it("accepts the four ranges and nothing else", () => {
    expect(isWeddingVolume("1-10")).toBe(true);
    expect(isWeddingVolume("11-25")).toBe(true);
    expect(isWeddingVolume("26-50")).toBe(true);
    expect(isWeddingVolume("50+")).toBe(true);
    expect(isWeddingVolume("")).toBe(false);
    expect(isWeddingVolume("100")).toBe(false);
  });
});