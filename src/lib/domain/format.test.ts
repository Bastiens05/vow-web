import { describe, expect, it } from "vitest";
import { formatLongDate, formatSlotTime, sortTimelineSlots, weddingTitle } from "./format";

describe("format", () => {
  it("formats a date in french without shifting the day", () => {
    expect(formatLongDate("2027-06-19")).toBe("19 juin 2027");
  });

  it("shortens a postgres time", () => {
    expect(formatSlotTime("16:30:00")).toBe("16:30");
  });

  it("joins the couple names", () => {
    expect(weddingTitle("Léa", "Hugo")).toBe("Léa & Hugo");
  });
});

describe("sortTimelineSlots", () => {
  it("orders by time then sort order", () => {
    const sorted = sortTimelineSlots([
      { title: "Dîner", startsAt: "20:00:00", sortOrder: 0 },
      { title: "Cérémonie", startsAt: "16:00:00", sortOrder: 2 },
      { title: "Arrivée", startsAt: "16:00:00", sortOrder: 1 },
    ]);
    expect(sorted.map((slot) => slot.title)).toEqual(["Arrivée", "Cérémonie", "Dîner"]);
  });
});
