import { describe, expect, it } from "vitest";
import { personalShiftNote } from "./shift-note";

describe("personalShiftNote", () => {
  it("names only the steps of one vendor", () => {
    expect(
      personalShiftNote([
        { userId: "a", title: "Cérémonie", newTime: "16:30" },
        { userId: "a", title: "Photos", newTime: "17:00" },
      ]),
    ).toBe("Quelques horaires vous concernent. Cérémonie passe à 16h30. Photos passe à 17h00.");
  });
});
