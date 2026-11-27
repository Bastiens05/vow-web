import { describe, expect, it } from "vitest";
import { budgetBalance, committedCents, paidCents, shownPaidCents } from "./budget-commit";

describe("budget commitments", () => {
  it("counts a pending invoice even when the typed line is zero", () => {
    expect(committedCents({ lineCents: 0, quoteCents: 0, invoiceCents: 370_000 })).toBe(370_000);
    expect(paidCents({ committed: 370_000, invoiceCents: 370_000, paymentCents: 0, linePaid: false })).toBe(0);
  });

  it("names the unpaid amount when no global budget is set", () => {
    expect(budgetBalance({ budgetCents: 0, engagedCents: 370_000, paidCents: 0 })).toEqual({
      label: "Reste à payer",
      cents: 370_000,
    });
    expect(budgetBalance({ budgetCents: 200_000, engagedCents: 370_000, paidCents: 0 })).toEqual({
      label: "Dépassement",
      cents: 170_000,
    });
    expect(budgetBalance({ budgetCents: 500_000, engagedCents: 250_000, paidCents: 0 })).toEqual({
      label: "Disponible",
      cents: 250_000,
    });
  });

  it("drops a marked line from Payé as soon as it is unmarked", () => {
    expect(shownPaidCents({ amountCents: 135_000, paymentCents: 0, markedPaid: true })).toBe(135_000);
    expect(shownPaidCents({ amountCents: 135_000, paymentCents: 0, markedPaid: false })).toBe(0);
    expect(shownPaidCents({ amountCents: 135_000, paymentCents: 40_000, markedPaid: false })).toBe(40_000);
  });

  it("does not add the quote on top of its invoice", () => {
    expect(committedCents({ lineCents: 1000, quoteCents: 370_000, invoiceCents: 370_000 })).toBe(370_000);
    expect(paidCents({ committed: 370_000, invoiceCents: 370_000, paymentCents: 100_000, linePaid: false })).toBe(100_000);
  });
});
