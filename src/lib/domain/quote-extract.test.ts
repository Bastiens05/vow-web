import { describe, expect, it } from "vitest";
import { draftFromModelText, parseQuoteDraft } from "./quote-extract";

describe("quote extract", () => {
  it("reads a model json object and ignores the prose around it", () => {
    const draft = draftFromModelText('Voici le devis.\n{"business_name":"Atelier","category":"photographer","email":"a@b.fr","phone":"06","amount_cents":180000}');
    expect(draft).toMatchObject({ businessName: "Atelier", category: "photographer", email: "a@b.fr", amountCents: 180000 });
  });

  it("falls back to an empty draft", () => {
    expect(parseQuoteDraft(null).category).toBe("other");
    expect(draftFromModelText("rien")).toMatchObject({ businessName: "", email: "" });
  });
});
