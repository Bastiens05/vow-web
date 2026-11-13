import { describe, expect, it } from "vitest";
import { callMessage, canCallNextGroup, canComposePhotoGroups, nextUncalled } from "./photo-call";

describe("photo call", () => {
  it("writes an SMS-ready line and skips groups already called", () => {
    expect(callMessage("Famille", "Jardin")).toBe("Votre photo est dans 2 minutes, rendez-vous à Jardin. Groupe : Famille.");
    expect(nextUncalled([{ calledAt: "t" }, { calledAt: null, id: "b" }])?.id).toBe("b");
  });

  it("lets the couple and the planner compose groups, and keeps the photographer on read", () => {
    expect(canComposePhotoGroups({ role: "couple", category: null })).toBe(true);
    expect(canComposePhotoGroups({ role: "vendor", category: "planner" })).toBe(true);
    expect(canComposePhotoGroups({ role: "vendor", category: "photographer", actingAsCouple: true })).toBe(true);
    expect(canComposePhotoGroups({ role: "vendor", category: "photographer" })).toBe(false);
    expect(canComposePhotoGroups({ role: "vendor", category: "videographer" })).toBe(false);
  });

  it("lets the photographer call the next group without composing the list", () => {
    expect(canCallNextGroup({ role: "vendor", category: "photographer" })).toBe(true);
    expect(canCallNextGroup({ role: "vendor", category: "videographer" })).toBe(true);
    expect(canCallNextGroup({ role: "couple", category: null })).toBe(true);
    expect(canCallNextGroup({ role: "vendor", category: "florist" })).toBe(false);
    expect(canComposePhotoGroups({ role: "vendor", category: "photographer" })).toBe(false);
  });
});
