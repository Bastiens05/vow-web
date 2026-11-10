import { describe, expect, it } from "vitest";
import { safeFileName, validateUpload } from "./uploads";

describe("validateUpload", () => {
  it("accepts a jpeg photo", () => {
    expect(validateUpload({ name: "a.jpg", type: "image/jpeg", size: 1000 }, "photo").ok).toBe(true);
  });

  it("rejects a pdf as a portfolio photo", () => {
    expect(validateUpload({ name: "a.pdf", type: "application/pdf", size: 1000 }, "photo").ok).toBe(false);
  });

  it("rejects an oversized document", () => {
    expect(
      validateUpload({ name: "a.pdf", type: "application/pdf", size: 11 * 1024 * 1024 }, "document").ok,
    ).toBe(false);
  });
});

describe("safeFileName", () => {
  it("strips accents and spaces", () => {
    expect(safeFileName("Déroulement du jour.pdf")).toBe("Deroulement-du-jour.pdf");
  });
});
