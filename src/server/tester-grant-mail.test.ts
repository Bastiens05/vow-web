import { describe, expect, it } from "vitest";
import { testerGrantEmailContent } from "@/server/product-mail";

describe("tester grant mail", () => {
  it("uses the vendor invitation button", () => {
    const content = testerGrantEmailContent({
      firstName: "Alex",
      planLabel: "Studio",
      discountPercent: 40,
      url: "https://vow-web.vercel.app/inscription?role=vendor&email=alex%40example.com&invite=tok",
    });
    expect(content.buttonLabel).toBe("Rejoindre en tant que prestataire");
    expect(content.buttonUrl).toContain("role=vendor");
    expect(content.body).toContain("40 %");
  });
});
