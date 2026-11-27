import { describe, expect, it } from "vitest";
import { defaultAutoShare, removalWarning, shareAudience, shareNotice, vaultFreshness, vendorVaultCategoryLabel } from "./vendor-vault";

describe("vendor vault", () => {
  it("keeps automatic sharing off unless the vendor turns it on", () => {
    expect(defaultAutoShare()).toBe(false);
  });

  it("warns before expiry and marks a past date as expired", () => {
    expect(vaultFreshness(null, 30, "2026-11-12")).toBe("none");
    expect(vaultFreshness("2027-06-01", 30, "2026-11-12")).toBe("ok");
    expect(vaultFreshness("2026-12-01", 30, "2026-11-12")).toBe("soon");
    expect(vaultFreshness("2026-11-01", 30, "2026-11-12")).toBe("expired");
  });

  it("names the vendor and the document in the share notice", () => {
    expect(shareNotice("Studio Camille", "Attestation RC Pro")).toBe("Studio Camille a partagé Attestation RC Pro.");
    expect(vendorVaultCategoryLabel("kbis")).toBe("Kbis");
  });

  it("names the person who loses the file when it is removed", () => {
    expect(shareAudience([null])).toBe("couple");
    expect(shareAudience(["vendor-user"])).toBe("vendor");
    expect(shareAudience([null, "vendor-user"])).toBe("both");
    expect(removalWarning("vendor")).toContain("prestataire");
    expect(removalWarning("couple")).toContain("couple");
  });
});
