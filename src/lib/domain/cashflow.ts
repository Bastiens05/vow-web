export type Installment = {
  dueOn: string;
  amountCents: number;
  collected: boolean;
  signed: boolean;
};

export type MonthBucket = {
  month: string;
  collectedCents: number;
  scheduledCents: number;
  unscheduledCents: number;
};

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function buildMonths(start: string, count: number): string[] {
  const [year, month] = start.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 + index, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export function bucketInstallments(input: {
  startMonth: string;
  months: number;
  rows: readonly Installment[];
  includeUnsigned: boolean;
}): MonthBucket[] {
  const keys = buildMonths(input.startMonth, input.months);
  const buckets = new Map(keys.map((month) => [month, { month, collectedCents: 0, scheduledCents: 0, unscheduledCents: 0 }]));
  for (const row of input.rows) {
    if (!row.signed && !input.includeUnsigned) continue;
    const month = monthKey(row.dueOn);
    const bucket = buckets.get(month);
    if (!bucket) continue;
    if (row.collected) bucket.collectedCents += row.amountCents;
    else if (row.signed) bucket.scheduledCents += row.amountCents;
    else bucket.unscheduledCents += row.amountCents;
  }
  return [...buckets.values()];
}

export function thinMonths(buckets: readonly MonthBucket[], thresholdCents: number): string[] {
  return buckets.filter((bucket) => bucket.collectedCents + bucket.scheduledCents < thresholdCents).map((bucket) => bucket.month);
}

export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const lat1 = a.latitude * rad;
  const lat2 = b.latitude * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function travelMinutes(km: number): number {
  if (!Number.isFinite(km) || km <= 0) return 0;
  return Math.round((km / 50) * 60);
}

export function hourlyRate(cents: number, minutes: number): number | null {
  if (minutes <= 0) return null;
  return Math.round(cents / (minutes / 60));
}
