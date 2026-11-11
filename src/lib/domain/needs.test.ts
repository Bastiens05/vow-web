import { describe, expect, it } from "vitest";
import { needConflicts } from "./needs";

describe("needConflicts", () => {
  it("flags overlapping access, the same parking spot, and too much power", () => {
    const conflicts = needConflicts(
      [
        { userId: "a", name: "Photo", accessStart: "08:00", accessEnd: "10:00", parking: "Cour", powerW: 2000 },
        { userId: "b", name: "Traiteur", accessStart: "09:00", accessEnd: "11:00", parking: "Cour", powerW: 4000 },
      ],
      5000,
    );
    expect(conflicts.map((item) => item.kind).sort()).toEqual(["access", "parking", "power"]);
  });

  it("stays quiet when the slots and the power fit", () => {
    expect(
      needConflicts(
        [
          { userId: "a", name: "Photo", accessStart: "08:00", accessEnd: "09:00", parking: "A", powerW: 1000 },
          { userId: "b", name: "Traiteur", accessStart: "09:00", accessEnd: "10:00", parking: "B", powerW: 1000 },
        ],
        3000,
      ),
    ).toEqual([]);
  });
});
