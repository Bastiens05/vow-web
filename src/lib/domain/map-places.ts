export type MapPlace = { label: string; address: string };

function keyOf(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

export function pratiquePlaceLabels(ceremony: string, reception: string): Set<string> {
  const labels = new Set<string>();
  if (keyOf(ceremony).length >= 3) labels.add("cérémonie");
  if (keyOf(reception).length >= 3) labels.add("réception");
  return labels;
}

/** Pratique addresses first, then extra places. The same address, or the same kind of place, is kept once. */
export function mapPlaces(input: { ceremony: string; reception: string; stops: MapPlace[] }): MapPlace[] {
  const places: MapPlace[] = [];
  const seen = new Set<string>();
  const kinds = pratiquePlaceLabels(input.ceremony, input.reception);
  function add(label: string, address: string) {
    const trimmed = address.trim();
    const key = keyOf(trimmed);
    if (key.length < 3 || seen.has(key)) return;
    seen.add(key);
    places.push({ label, address: trimmed });
  }
  add("Cérémonie", input.ceremony);
  add("Réception", input.reception);
  for (const stop of input.stops) {
    if (kinds.has(stop.label.trim().toLowerCase())) continue;
    add(stop.label, stop.address);
  }
  return places;
}
