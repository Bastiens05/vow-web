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

  it("says a lifetime invitation is free forever", () => {
    const content = testerGrantEmailContent({
      planLabel: "Pro",
      discountPercent: 0,
      url: "https://vow-web.vercel.app/inscription?role=vendor",
      grantType: "lifetime",
    });
    expect(content.body).toContain("pour toujours");
    expect(content.body).toContain("Pro");
    expect(content.body).not.toContain("remise");
  });
});
