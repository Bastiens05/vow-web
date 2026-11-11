import { describe, expect, it } from "vitest";
import { canAddCrew, payCents } from "./crew";

describe("crew", () => {
  it("pays from planned minutes and stops at fifteen active people", () => {
    expect(payCents("hour", 4000, 90)).toBe(6000);
    expect(payCents("flat", 15000, 90)).toBe(15000);
    expect(canAddCrew(14)).toBe(true);
    expect(canAddCrew(15)).toBe(false);
  });
});
