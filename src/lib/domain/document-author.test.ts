import { describe, expect, it } from "vitest";
import { documentAuthorLabel } from "./document-author";

describe("document author", () => {
  it("shows the role, and Vous for the reader", () => {
    expect(documentAuthorLabel({ uploadedBy: "me", viewerId: "me", role: "vendor", category: "florist" })).toBe("Vous");
    expect(documentAuthorLabel({ uploadedBy: "florist", viewerId: "couple", role: "vendor", category: "photographer" })).toBe("Photographe");
    expect(documentAuthorLabel({ uploadedBy: "couple", viewerId: "florist", role: "couple", category: null })).toBe("Couple");
  });
});
