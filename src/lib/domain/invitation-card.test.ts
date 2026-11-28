import { describe, expect, it } from "vitest";
import { invitationHidesContact } from "./invitation-card";

describe("invitation card", () => {
  it("hides a search invite before the column exists when name and trade are stored", () => {
    expect(invitationHidesContact({ invitee_name: "Atelier Lumière", invitee_trade: "photographer" })).toBe(true);
  });

  it("keeps a typed e-mail visible", () => {
    expect(invitationHidesContact({ invitee_name: "", invitee_trade: "" })).toBe(false);
    expect(invitationHidesContact({ invitee_name: "Atelier", invitee_trade: "photographer", invite_source: "manual" })).toBe(false);
  });

  it("hides the address once the row is marked as search", () => {
    expect(invitationHidesContact({ invitee_name: "Atelier", invitee_trade: "photographer", invite_source: "search" })).toBe(true);
  });
});
