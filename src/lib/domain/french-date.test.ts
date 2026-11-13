import { describe, expect, it } from "vitest";
import { frenchDateToIso, isoToFrench } from "@/lib/domain/french-date";

describe("French date", () => {
  it("reads jj/mm/aaaa", () => {
    expect(frenchDateToIso("03/12/2026")).toBe("2026-12-03");
    expect(frenchDateToIso("2026-12-03")).toBe("2026-12-03");
    expect(frenchDateToIso("31/02/2026")).toBeNull();
    expect(frenchDateToIso("12/03/2026")).toBe("2026-03-12");
    expect(frenchDateToIso("")).toBeNull();
    expect(isoToFrench("2026-12-03")).toBe("03/12/2026");
  });
});
