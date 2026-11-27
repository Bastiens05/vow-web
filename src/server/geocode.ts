import { suggestionsFromBan } from "@/lib/domain/address";

export async function geocodeAddress(query: string): Promise<{ latitude: number; longitude: number } | null> {
  const text = query.trim();
  if (text.length < 3) return null;
  try {
    const response = await fetch(
      `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(text)}&limit=1`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const [first] = suggestionsFromBan(await response.json());
    return first ? { latitude: first.latitude, longitude: first.longitude } : null;
  } catch {
    return null;
  }
}
