export type CentsResult =
  | { ok: true; cents: number | null }
  | { ok: false; error: string };

export function parseEurosToCents(input: string): CentsResult {
  const trimmed = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!trimmed) return { ok: true, cents: null };
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { ok: false, error: "Indiquez un prix en euros, par exemple 1 200 ou 350,50." };
  }
  const cents = Math.round(Number(trimmed) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0) {
    return { ok: false, error: "Ce prix n'est pas valide." };
  }
  return { ok: true, cents };
}

export function formatPriceCents(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
