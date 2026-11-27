export type MapPoint = { latitude: number; longitude: number };

function query(address: string, point?: MapPoint | null): string {
  return point ? `${point.latitude},${point.longitude}` : address;
}

export function googleMapsUrl(address: string, point?: MapPoint | null): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query(address, point))}`;
}

export function appleMapsUrl(address: string, point?: MapPoint | null): string {
  if (!point) return `https://maps.apple.com/?q=${encodeURIComponent(address)}`;
  return `https://maps.apple.com/?ll=${point.latitude},${point.longitude}&q=${encodeURIComponent(address)}`;
}

export function googleDirectionsUrl(origin: string, destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
}

/** Directions to one place. The maps app starts from the current position. */
export function googleDirectionsTo(destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function appleDirectionsUrl(origin: string, destination: string): string {
  return `https://maps.apple.com/?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(destination)}`;
}

export function appleDirectionsTo(destination: string): string {
  return `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}`;
}
