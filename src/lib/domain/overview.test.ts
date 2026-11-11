import { describe, expect, it } from "vitest";
import { countLabel, moneyStatus, questionStatus, sheetStatus } from "./overview";

describe("overview status", () => {
  it("counts answers, invoices and an empty sheet", () => {
    expect(questionStatus(["", "Jardin"])).toBe("1 réponse");
    expect(questionStatus(["", ""])).toBe("À compléter");
    expect(moneyStatus(["pending", "paid"], 0)).toBe("1 facture en attente");
    expect(moneyStatus(["paid"], 1)).toBe("Payé");
    expect(moneyStatus([], 2)).toBe("2 devis");
    expect(sheetStatus(false)).toBe("À compléter");
    expect(countLabel(3, "lieu", "lieux", "À compléter")).toBe("3 lieux");
    expect(countLabel(0, "lieu", "lieux", "À compléter")).toBe("À compléter");
  });
});
