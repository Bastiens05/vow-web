import { describe, expect, it } from "vitest";
import { coupleProfileName, intentMetadata, readSignupIntent, signupMissing, vendorInviteReady } from "./signup-intent";

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

describe("signup gaps", () => {
  it("names the missing couple date and the invited vendor trade", () => {
    const couple = readSignupIntent(new FormData(), "couple");
    expect(signupMissing({ email: "a@b.fr", password: "12345678", emailValid: true, kind: "couple", intent: couple })).toContain(
      "la date du mariage",
    );
    const vendor = readSignupIntent(new FormData(), "vendor");
    expect(vendorInviteReady(vendor)).toBe(false);
    const dj = new FormData();
    dj.set("category", "dj");
    dj.set("music_kind", "choir");
    expect(readSignupIntent(dj, "vendor").musicKind).toBe("choir");
    const photographer = new FormData();
    photographer.set("category", "photographer");
    photographer.set("music_kind", "choir");
    expect(readSignupIntent(photographer, "vendor").musicKind).toBe("");
    expect(signupMissing({ email: "", password: "", emailValid: false, kind: "invite-vendor", intent: vendor })).toEqual([
      "un e-mail valide",
      "un mot de passe d'au moins 8 caractères",
      "le métier",
      "le nom de l'activité",
    ]);
  });
});
