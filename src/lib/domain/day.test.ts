import { describe, expect, it } from "vitest";
import { addMinutesToTime, describeShift, minutesBetween } from "./day";

describe("addMinutesToTime", () => {
  it("adds half an hour", () => {
    expect(addMinutesToTime("20:00:00", 30)).toBe("20:30");
  });

  it("wraps past midnight", () => {
    expect(addMinutesToTime("23:50", 15)).toBe("00:05");
  });
});

describe("describeShift", () => {
  it("matches the wedding-day sentence", () => {
    expect(describeShift("Alexandre", "l'entrée en salle", 30, "20:30")).toBe(
      "Alexandre a décalé l'entrée en salle de 30 minutes, c'est désormais à 20h30.",
    );
  });

  it("uses the singular and the early direction", () => {
    expect(describeShift("Léa", "Cérémonie", -1, "15:59")).toBe(
      "Léa a avancé Cérémonie de 1 minute, c'est désormais à 15h59.",
    );
  });
});

describe("minutesBetween", () => {
  it("measures a delay", () => {
    expect(minutesBetween("20:00", "20:30")).toBe(30);
  });
});
