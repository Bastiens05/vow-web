import { describe, expect, it } from "vitest";
import { evaluateTech, type TechNeed, type VenueSheet } from "./tech-rules";

const venue: VenueSheet = { outlets: 2, maxPowerW: 2000, vehicleMaxM: 6, curfew: "00:30", oneDoor: true };

function need(partial: Partial<TechNeed>): TechNeed {
  return {
    vendorId: "a",
    trade: "dj",
    outlets: 1,
    amps: 10,
    vehicleM: 4,
    setupStart: "14:00",
    setupEnd: "15:00",
    teardown: "00:00",
    needsXlr: false,
    ...partial,
  };
}

describe("tech rules", () => {
  it("flags outlets, power, audio, the door and the curfew", () => {
    const issues = evaluateTech(
      [
        need({ vendorId: "dj", trade: "dj", outlets: 2, setupStart: "15:00", setupEnd: "17:00" }),
        need({ vendorId: "video", trade: "videographer", outlets: 2, amps: 32, needsXlr: true, vehicleM: 8, teardown: "01:00", setupStart: "16:00", setupEnd: "18:00" }),
      ],
      venue,
    );
    expect(issues.map((issue) => issue.code).sort()).toEqual(["amps", "curfew", "door", "outlets", "vehicle", "xlr"]);
  });
});
