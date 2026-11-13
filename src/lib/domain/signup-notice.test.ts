import { describe, expect, it } from "vitest";
import { signupNoticeBody } from "./signup-notice";

describe("signup notices", () => {
  it("names the vendor email and trade", () => {
    expect(signupNoticeBody({ role: "vendor", email: "dj@example.com", tradeLabel: "DJ / musique" })).toBe(
      "Nouveau compte prestataire : dj@example.com · DJ / musique",
    );
  });

  it("names a couple account by email", () => {
    expect(signupNoticeBody({ role: "couple", email: "lea@example.com" })).toBe("Nouveau compte mariés : lea@example.com");
  });
});
