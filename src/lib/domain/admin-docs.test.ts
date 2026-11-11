import { describe, expect, it } from "vitest";
import { docStatus } from "./admin-docs";

describe("admin docs", () => {
  it("marks a document valid, soon, or expired", () => {
    expect(docStatus("2026-12-20", "2026-11-11")).toBe("valid");
    expect(docStatus("2026-11-20", "2026-11-11")).toBe("soon");
    expect(docStatus("2026-11-01", "2026-11-11")).toBe("expired");
    expect(docStatus(null, "2026-11-11")).toBe("valid");
  });
});
