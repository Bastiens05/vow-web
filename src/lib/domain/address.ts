export type AddressSuggestion = {
  label: string;
  street: string;
  postcode: string;
  city: string;
  latitude: number;
  longitude: number;
};

type BanFeature = {
  properties?: { label?: string; name?: string; postcode?: string; city?: string };
  geometry?: { coordinates?: number[] };
};

export function suggestionsFromBan(body: unknown): AddressSuggestion[] {
  const features = (body as { features?: BanFeature[] } | null)?.features;
  if (!Array.isArray(features)) return [];
  const suggestions: AddressSuggestion[] = [];
  for (const feature of features) {
    const label = feature.properties?.label?.trim() ?? "";
    const coordinates = feature.geometry?.coordinates;
    const longitude = coordinates?.[0];
    const latitude = coordinates?.[1];
    if (!label || typeof longitude !== "number" || typeof latitude !== "number") continue;
    suggestions.push({
      label,
      street: feature.properties?.name?.trim() || label,
      postcode: feature.properties?.postcode?.trim() || "",
      city: feature.properties?.city?.trim() || "",
      latitude,
      longitude,
    });
    if (suggestions.length === 5) break;
  }
  return suggestions;
}
