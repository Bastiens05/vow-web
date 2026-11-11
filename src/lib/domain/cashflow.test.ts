import { describe, expect, it } from "vitest";
import { bucketInstallments, distanceKm, hourlyRate, thinMonths, travelMinutes } from "./cashflow";

describe("cashflow", () => {
  it("splits collected, scheduled and unsigned, and skips unsigned by default", () => {
    const buckets = bucketInstallments({
      startMonth: "2026-11",
      months: 2,
      includeUnsigned: false,
      rows: [
        { dueOn: "2026-11-02", amountCents: 100, collected: true, signed: true },
        { dueOn: "2026-12-01", amountCents: 50, collected: false, signed: true },
        { dueOn: "2026-12-01", amountCents: 999, collected: false, signed: false },
      ],
    });
    expect(buckets[0]).toMatchObject({ collectedCents: 100, scheduledCents: 0 });
    expect(buckets[1]).toMatchObject({ scheduledCents: 50, unscheduledCents: 0 });
  });

  it("flags a thin month and estimates travel from two points", () => {
    const buckets = bucketInstallments({
      startMonth: "2026-11",
      months: 1,
      includeUnsigned: false,
      rows: [{ dueOn: "2026-11-01", amountCents: 10, collected: false, signed: true }],
    });
    expect(thinMonths(buckets, 100)).toEqual(["2026-11"]);
    const km = distanceKm({ latitude: 44.84, longitude: -0.58 }, { latitude: 44.78, longitude: -0.63 });
    expect(km).toBeGreaterThan(5);
    expect(travelMinutes(50)).toBe(60);
    expect(hourlyRate(12000, 120)).toBe(6000);
  });
});
