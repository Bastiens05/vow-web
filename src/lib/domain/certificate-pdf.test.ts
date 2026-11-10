import { describe, expect, it } from "vitest";
import { certificatePdf } from "./certificate-pdf";

describe("certificatePdf", () => {
  it("builds a pdf that names the simple signature and the hash", () => {
    const bytes = certificatePdf({
      documentName: "contrat.pdf",
      sha256: "ab".repeat(32),
      signerName: "Léa Martin",
      signedAt: "10 nov. 2026",
      ip: "127.0.0.1",
      userAgent: "test",
    });
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("eIDAS SES");
    expect(text).toContain("ab".repeat(32));
  });
});