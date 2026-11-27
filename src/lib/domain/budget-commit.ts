/** What a vendor line shows as committed: the invoices, otherwise the accepted quote, otherwise the typed line. */
export function committedCents(input: { lineCents: number | null; quoteCents: number; invoiceCents: number }): number {
  if (input.invoiceCents > 0) return input.invoiceCents;
  if (input.quoteCents > 0) return input.quoteCents;
  return input.lineCents ?? 0;
}

export function budgetBalance(input: { budgetCents: number; engagedCents: number; paidCents: number }): { label: string; cents: number } {
  if (input.budgetCents > 0 && input.engagedCents > input.budgetCents) {
    return { label: "Dépassement", cents: input.engagedCents - input.budgetCents };
  }
  if (input.budgetCents > 0) {
    return { label: "Disponible", cents: input.budgetCents - input.engagedCents };
  }
  return { label: "Reste à payer", cents: Math.max(0, input.engagedCents - input.paidCents) };
}

/** Payments already recorded, plus the whole line when the couple has marked it paid. */
export function shownPaidCents(input: { amountCents: number; paymentCents: number; markedPaid: boolean }): number {
  if (input.markedPaid) return Math.max(input.paymentCents, input.amountCents);
  return Math.max(0, input.paymentCents);
}

export function paidCents(input: { committed: number; invoiceCents: number; paymentCents: number; linePaid: boolean }): number {
  if (input.invoiceCents > 0) return Math.min(input.paymentCents, input.invoiceCents);
  return input.linePaid ? input.committed : 0;
}
