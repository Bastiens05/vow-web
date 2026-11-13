/** Shows a stored ISO date as jj/mm/aaaa. Other text is left as typed. */
export function isoToFrench(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/** Accepts jj/mm/aaaa, and an ISO date if the browser still sends one. */
export function frenchDateToIso(input: string): string | null {
  const trimmed = input.trim();
  const french = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const year = french ? Number(french[3]) : iso ? Number(iso[1]) : NaN;
  const month = french ? Number(french[2]) : iso ? Number(iso[2]) : NaN;
  const day = french ? Number(french[1]) : iso ? Number(iso[3]) : NaN;
  if (!french && !iso) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}
