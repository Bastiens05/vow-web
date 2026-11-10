export const VENDOR_CATEGORIES = [
  "photographer",
  "dj",
  "florist",
  "caterer",
  "venue",
  "planner",
  "beauty",
  "other",
] as const;

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

const LABELS: Record<VendorCategory, string> = {
  photographer: "Photographe",
  dj: "DJ",
  florist: "Fleuriste",
  caterer: "Traiteur",
  venue: "Lieu de réception",
  planner: "Wedding planner",
  beauty: "Beauté",
  other: "Autre",
};

export function isVendorCategory(value: string): value is VendorCategory {
  return (VENDOR_CATEGORIES as readonly string[]).includes(value);
}

export function categoryLabel(category: VendorCategory): string {
  return LABELS[category];
}
