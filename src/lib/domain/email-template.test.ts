import { describe, expect, it } from "vitest";
import { renderEmail } from "./email-template";

describe("renderEmail", () => {
  it("keeps one button and escapes the heading", () => {
    const { html, text } = renderEmail({
      heading: "Bonjour <Léa>",
      body: "Le lien ouvre le mariage.",
      buttonLabel: "Ouvrir le mariage",
      buttonUrl: "https://vow.test/mariage/1",
    });
    expect(html).toContain("VOW");
    expect(html).toContain("Bonjour &lt;Léa&gt;");
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).not.toContain("ne plus recevoir");
    expect(text).toContain("https://vow.test/mariage/1");
  });

  it("adds the reminder unsubscribe link only when a token url is given", () => {
    const { html } = renderEmail({
      heading: "Rappel",
      body: "Les infos pratiques manquent.",
      buttonLabel: "Ouvrir",
      buttonUrl: "https://vow.test/mariage/1",
      unsubscribeUrl: "https://vow.test/desabonnement/abc",
    });
    expect(html.match(/<a /g)).toHaveLength(2);
    expect(html).toContain("https://vow.test/desabonnement/abc");
  });
});
