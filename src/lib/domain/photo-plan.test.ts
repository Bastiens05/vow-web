import { describe, expect, it } from "vitest";
import { coupleSessionSlot, photoGroupsFromGuests, photoNames } from "./photo-plan";

describe("plan photo", () => {
  it("builds one group per table from the guest list", () => {
    expect(
      photoGroupsFromGuests([
        { fullName: "Anne Martin", tableLabel: "Famille" },
        { fullName: "Louis Martin", tableLabel: "Famille" },
        { fullName: "  ", tableLabel: "Famille" },
        { fullName: "Camille", tableLabel: "" },
      ]),
    ).toEqual([
      { title: "Table Famille", people: "Anne Martin, Louis Martin" },
      { title: "Sans table", people: "Camille" },
    ]);
  });

  it("keeps only the names for the photographer", () => {
    expect(photoNames([" Anne Martin ", "", "  ", "Louis"])).toEqual(["Anne Martin", "Louis"]);
  });

  it("finds the couple portrait already on the day plan", () => {
    expect(
      coupleSessionSlot([
        { title: "Cérémonie", startsAt: "15:00" },
        { title: "Séance couple", startsAt: "16:30" },
      ]),
    ).toEqual({ title: "Séance couple", startsAt: "16:30" });
    expect(coupleSessionSlot([{ title: "Discours", startsAt: "20:00" }])).toBeNull();
  });
});
