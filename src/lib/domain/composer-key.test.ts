import { describe, expect, it } from "vitest";
import { acceptMessageSubmit, enterSendsMessage } from "./composer-key";

const desktop = { touchKeyboard: false };
const phone = { touchKeyboard: true };
const enter = { key: "Enter", shiftKey: false, isComposing: false, keyCode: 13, repeat: false };

describe("envoi au clavier", () => {
  it("envoie avec Entrée, comme le bouton", () => {
    expect(enterSendsMessage(enter, desktop)).toBe(true);
  });

  it("laisse Maj+Entrée insérer une ligne", () => {
    expect(enterSendsMessage({ ...enter, shiftKey: true }, desktop)).toBe(false);
  });

  it("n'envoie pas pendant une composition IME", () => {
    expect(enterSendsMessage({ ...enter, isComposing: true }, desktop)).toBe(false);
    expect(enterSendsMessage({ ...enter, keyCode: 229 }, desktop)).toBe(false);
  });

  it("garde Entrée comme saut de ligne sur un clavier tactile", () => {
    expect(enterSendsMessage(enter, phone)).toBe(false);
    expect(enterSendsMessage({ ...enter, shiftKey: true }, phone)).toBe(false);
  });

  it("ignore une touche maintenue et les autres touches", () => {
    expect(enterSendsMessage({ ...enter, repeat: true }, desktop)).toBe(false);
    expect(enterSendsMessage({ ...enter, key: "a" }, desktop)).toBe(false);
  });

  it("ignores a second submit while the first is still sending", () => {
    expect(acceptMessageSubmit({ body: "Bonjour", pending: false, locked: false })).toBe(true);
    expect(acceptMessageSubmit({ body: "Bonjour", pending: true, locked: false })).toBe(false);
    expect(acceptMessageSubmit({ body: "Bonjour", pending: false, locked: true })).toBe(false);
    expect(acceptMessageSubmit({ body: "   ", pending: false, locked: false })).toBe(false);
  });
});
