import { describe, expect, it } from "vitest";
import { positiveBadgeCount } from "@/lib/domain/badge-count";

describe("badge count", () => {
  it("never renders zero", () => {
    expect(positiveBadgeCount(0)).toBeNull();
    expect(positiveBadgeCount(-1)).toBeNull();
    expect(positiveBadgeCount(1.5)).toBeNull();
    expect(positiveBadgeCount(Number.NaN)).toBeNull();
    expect(positiveBadgeCount(3)).toBe(3);
  });
});
