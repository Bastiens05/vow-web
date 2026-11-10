export const VENDOR_CATEGORIES = [
  "photographer",
  "videographer",
  "dj",
  "florist",
  "caterer",
  "venue",
  "planner",
  "beauty",
  "officiant",
  "other",
] as const;

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

const LABELS: Record<VendorCategory, string> = {
  photographer: "Photographe",
  videographer: "Vidéaste",
  dj: "DJ / musique",
  florist: "Fleuriste",
  caterer: "Traiteur",
  venue: "Lieu / salle",
  planner: "Wedding planner",
  beauty: "Coiffure / maquillage",
  officiant: "Officiant",
  other: "Autre",
};

export function isVendorCategory(value: string): value is VendorCategory {
  return (VENDOR_CATEGORIES as readonly string[]).includes(value);
}

export function categoryLabel(category: VendorCategory): string {
  return LABELS[category];
}
