import { describe, expect, it } from "vitest";
import {
  documentSuggestions,
  dueOn,
  formatOffset,
  moveItem,
  parseOffset,
  requestStatusLabel,
  savedRequests,
} from "./client-documents";

describe("client documents", () => {
  it("offers suggestions without applying them", () => {
    expect(documentSuggestions("photographer").length).toBeGreaterThan(0);
    expect(documentSuggestions("dj").map((item) => item.title)).toContain("Liste des musiques souhaitées");
    expect(savedRequests([])).toEqual([]);
    expect(savedRequests(documentSuggestions("photographer"))).toHaveLength(documentSuggestions("photographer").length);
  });

  it("turns a relative deadline into a date and a short label", () => {
    expect(formatOffset(null)).toBeNull();
    expect(formatOffset(0)).toBe("Jour J");
    expect(formatOffset(-30)).toBe("J-30");
    expect(formatOffset(7)).toBe("J+7");
    expect(dueOn("2027-06-19", -30)).toBe("2027-05-20");
    expect(dueOn("2027-06-19", null)).toBeNull();
    expect(dueOn(null, -30)).toBeNull();
    expect(parseOffset("")).toBeNull();
    expect(parseOffset("-30")).toBe(-30);
    expect(parseOffset("400")).toBeNaN();
  });

  it("labels the three states and a correction", () => {
    expect(requestStatusLabel("needed")).toBe("À fournir");
    expect(requestStatusLabel("sent")).toBe("Envoyé");
    expect(requestStatusLabel("validated")).toBe("Validé");
    expect(requestStatusLabel("correction")).toBe("À corriger");
  });

  it("reorders without dropping an item", () => {
    expect(moveItem(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
  });
});
