import { describe, expect, it } from "vitest";
import { invitationHidesContact } from "./invitation-card";

describe("invitation card", () => {
  it("hides the address of a search invite before the column exists", () => {
    expect(invitationHidesContact({ invitee_name: "Atelier Lumière", invitee_trade: "photographer" })).toBe(true);
  });

  it("keeps a typed e-mail visible when only the address was given", () => {
    expect(invitationHidesContact({ invitee_name: "", invitee_trade: "", conceal_contact: false })).toBe(false);
    expect(invitationHidesContact({ invitee_name: "", invitee_trade: "" })).toBe(false);
  });

  it("follows the column once the migration is applied", () => {
    expect(invitationHidesContact({ invitee_name: "Atelier", invitee_trade: "photo", conceal_contact: true })).toBe(true);
    expect(invitationHidesContact({ invitee_name: "Atelier", invitee_trade: "photo", conceal_contact: false })).toBe(false);
  });
});
