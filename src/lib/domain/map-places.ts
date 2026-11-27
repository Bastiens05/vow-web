export type MapPlace = { label: string; address: string };

function keyOf(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Pratique addresses first, then extra places. The same address is kept once. */
export function mapPlaces(input: { ceremony: string; reception: string; stops: MapPlace[] }): MapPlace[] {
  const places: MapPlace[] = [];
  const seen = new Set<string>();
  function add(label: string, address: string) {
    const trimmed = address.trim();
    const key = keyOf(trimmed);
    if (key.length < 3 || seen.has(key)) return;
    seen.add(key);
    places.push({ label, address: trimmed });
  }
  add("Cérémonie", input.ceremony);
  add("Réception", input.reception);
  for (const stop of input.stops) add(stop.label, stop.address);
  return places;
}
