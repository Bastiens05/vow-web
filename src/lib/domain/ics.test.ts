import { describe, expect, it } from "vitest";
import { parseEvents, renderIcs } from "./ics";

describe("renderIcs", () => {
  it("writes an all-day wedding and a timed step", () => {
    const ics = renderIcs([
      { uid: "w@vow", title: "Léa & Hugo", start: "2027-06-19", end: null, allDay: true },
      { uid: "s@vow", title: "Cérémonie", start: "2027-06-19T16:00:00", end: "2027-06-19T17:00:00", allDay: false },
    ]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART;VALUE=DATE:20270619");
    expect(ics).toContain("DTSTART:20270619T160000");
    expect(ics).toContain("SUMMARY:Cérémonie");
  });

  it("ignores rows that are not events", () => {
    expect(parseEvents([{ uid: "a", title: "A", start: "2027-01-01", allDay: true }, null, { title: "no" }])).toHaveLength(1);
  });
});
