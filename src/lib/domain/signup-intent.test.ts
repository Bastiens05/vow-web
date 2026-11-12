import { describe, expect, it } from "vitest";
import { coupleProfileName, intentMetadata, readSignupIntent } from "./signup-intent";

describe("couple profile name", () => {
  it("uses the first partner's first and last name, without a separate full name", () => {
    const form = new FormData();
    form.set("partner_one", "Bastien");
    form.set("partner_one_last", "Sellier");
    form.set("partner_two", "Léa");
    form.set("partner_two_last", "Martin");
    form.set("wedding_date", "2027-06-19");
    const intent = readSignupIntent(form, "couple");
    expect(coupleProfileName(intent)).toBe("Bastien Sellier");
    expect(intentMetadata(intent).full_name).toBe("Bastien Sellier");
  });
});
