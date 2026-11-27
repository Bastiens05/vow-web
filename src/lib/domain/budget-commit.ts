/** What a vendor line shows as committed: the invoices, otherwise the accepted quote, otherwise the typed line. */
export function committedCents(input: { lineCents: number | null; quoteCents: number; invoiceCents: number }): number {
  if (input.invoiceCents > 0) return input.invoiceCents;
  if (input.quoteCents > 0) return input.quoteCents;
  return input.lineCents ?? 0;
}

export function paidCents(input: { committed: number; invoiceCents: number; paymentCents: number; linePaid: boolean }): number {
  if (input.invoiceCents > 0) return Math.min(input.paymentCents, input.invoiceCents);
  return input.linePaid ? input.committed : 0;
}
