import { describe, expect, it } from "vitest";
import { callMessage, nextUncalled } from "./photo-call";

describe("photo call", () => {
  it("writes an SMS-ready line and skips groups already called", () => {
    expect(callMessage("Famille", "Jardin")).toBe("Votre photo est dans 2 minutes, rendez-vous à Jardin. Groupe : Famille.");
    expect(nextUncalled([{ calledAt: "t" }, { calledAt: null, id: "b" }])?.id).toBe("b");
  });
});
