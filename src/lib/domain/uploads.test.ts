import { describe, expect, it } from "vitest";
import { fittedSize, safeFileName, validateUpload } from "./uploads";

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

describe("fittedSize", () => {
  it("réduit un grand logo sous le plus grand côté, et laisse une petite image", () => {
    expect(fittedSize(4000, 2000)).toEqual({ width: 1024, height: 512 });
    expect(fittedSize(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fittedSize(0, 0)).toEqual({ width: 1, height: 1 });
  });
});

describe("safeFileName", () => {
  it("strips accents and spaces", () => {
    expect(safeFileName("Déroulement du jour.pdf")).toBe("Deroulement-du-jour.pdf");
  });
});
