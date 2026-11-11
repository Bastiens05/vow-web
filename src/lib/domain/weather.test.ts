import { describe, expect, it } from "vitest";
import { weatherBreach } from "./weather";

describe("weatherBreach", () => {
  const limits = { rainMm: 1, rainProbability: 50, windKmh: 40 };

  it("names the threshold that was crossed and points at the rain plan", () => {
    expect(weatherBreach({ rainMm: 4, rainProbability: 20, windKmh: 10 }, limits)).toContain("plan pluie");
    expect(weatherBreach({ rainMm: 4, rainProbability: 20, windKmh: 10 }, limits)).toContain("4 mm");
  });

  it("stays quiet under every threshold", () => {
    expect(weatherBreach({ rainMm: 0, rainProbability: 10, windKmh: 12 }, limits)).toBeNull();
  });
});
