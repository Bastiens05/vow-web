import { weddingDayMinutes } from "@/lib/domain/day";

export type MapPlace = { label: string; address: string };
export type MapStop = { label: string; address: string; time?: string | null };

function keyOf(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

export function pratiquePlaceLabels(ceremony: string, reception: string): Set<string> {
  const labels = new Set<string>();
  if (keyOf(ceremony).length >= 3) labels.add("cérémonie");
  if (keyOf(reception).length >= 3) labels.add("réception");
  return labels;
}

function clock(value: string | null | undefined): number | null {
  const match = /(\d{1,2})\s*[:h]\s*(\d{2})/.exec(value ?? "");
  if (!match) return null;
  return weddingDayMinutes(`${match[1].padStart(2, "0")}:${match[2]}`);
}

/** Every place, including Pratique, in time order. The same moment at the same address is kept once. */
export function mapPlaces(input: {
  ceremony: string;
  ceremonyTime?: string | null;
  reception: string;
  receptionTime?: string | null;
  stops: MapStop[];
}): MapPlace[] {
  const kinds = pratiquePlaceLabels(input.ceremony, input.reception);
  const rows: Array<MapPlace & { at: number | null; order: number }> = [];
  function consider(label: string, address: string, time: string | null | undefined, order: number) {
    const trimmed = address.trim();
    if (keyOf(trimmed).length < 3) return;
    rows.push({ label, address: trimmed, at: clock(time), order });
  }
  consider("Cérémonie", input.ceremony, input.ceremonyTime, 0);
  consider("Réception", input.reception, input.receptionTime, 1);
  input.stops.forEach((stop, index) => {
    if (kinds.has(stop.label.trim().toLowerCase())) return;
    consider(stop.label, stop.address, stop.time, index + 2);
  });
  rows.sort((a, b) => {
    if (a.at !== null && b.at !== null && a.at !== b.at) return a.at - b.at;
    if (a.at !== null && b.at === null) return -1;
    if (a.at === null && b.at !== null) return 1;
    return a.order - b.order;
  });
  const places: MapPlace[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const key = `${keyOf(row.address)}|${row.label.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    places.push({ label: row.label, address: row.address });
  }
  return places;
}
