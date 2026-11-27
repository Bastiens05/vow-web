import { describe, expect, it } from "vitest";
import { goldenHour } from "./solar";

describe("lumière dorée", () => {
  it("places the June evening window after 20 h in Paris", () => {
    const hour = goldenHour("2026-06-21", 48.8566, 2.3522);
    expect(hour).not.toBeNull();
    expect(hour!.eveningStart >= "20:00").toBe(true);
    expect(hour!.eveningStart < hour!.eveningEnd).toBe(true);
    expect(hour!.morningStart < hour!.morningEnd).toBe(true);
    expect(hour!.morningEnd <= "08:30").toBe(true);
  });

  it("refuses a date or a coordinate that cannot be calculated", () => {
    expect(goldenHour("21/06/2026", 48, 2)).toBeNull();
    expect(goldenHour("2026-06-21", 120, 2)).toBeNull();
  });
});
