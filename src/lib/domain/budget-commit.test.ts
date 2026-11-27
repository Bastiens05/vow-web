import { describe, expect, it } from "vitest";
import { committedCents, paidCents } from "./budget-commit";

describe("budget commitments", () => {
  it("counts a pending invoice even when the typed line is zero", () => {
    expect(committedCents({ lineCents: 0, quoteCents: 0, invoiceCents: 370_000 })).toBe(370_000);
    expect(paidCents({ committed: 370_000, invoiceCents: 370_000, paymentCents: 0, linePaid: false })).toBe(0);
  });

  it("does not add the quote on top of its invoice", () => {
    expect(committedCents({ lineCents: 1000, quoteCents: 370_000, invoiceCents: 370_000 })).toBe(370_000);
    expect(paidCents({ committed: 370_000, invoiceCents: 370_000, paymentCents: 100_000, linePaid: false })).toBe(100_000);
  });
});
