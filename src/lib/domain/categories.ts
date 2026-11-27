/** Trades a vendor can choose. Names follow the Mariages.net list. */
export const VENDOR_CATEGORIES = [
  "venue",
  "caterer",
  "cake",
  "wine",
  "photographer",
  "videographer",
  "dj",
  "animation",
  "planner",
  "officiant",
  "florist",
  "decor",
  "hair",
  "makeup",
  "attire",
  "stationery",
  "transport",
  "other",
] as const;

/** Kept so an existing coiffure-et-maquillage account is still a valid trade. */
export const LEGACY_CATEGORIES = ["beauty"] as const;

export const MUSIC_KINDS = ["dj", "band", "orchestra", "choir"] as const;

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number] | (typeof LEGACY_CATEGORIES)[number];
export type MusicKind = (typeof MUSIC_KINDS)[number];

const LABELS: Record<VendorCategory, string> = {
  venue: "Lieux de réception",
  caterer: "Traiteur",
  cake: "Wedding cake",
  wine: "Vin et Spiritueux",
  photographer: "Photo",
  videographer: "Vidéo",
  dj: "Musique",
  animation: "Animation",
  planner: "Wedding planner",
  officiant: "Officiants",
  florist: "Fleurs",
  decor: "Déco et location de matériel",
  hair: "Coiffure",
  makeup: "Maquillage",
  attire: "Tenues",
  stationery: "Faire-part",
  transport: "Voiture et Transports",
  other: "Autre",
  beauty: "Coiffure et maquillage",
};

const MUSIC_LABELS: Record<MusicKind, string> = {
  dj: "DJ",
  band: "Groupe",
  orchestra: "Orchestre",
  choir: "Chorale",
};

export function isVendorCategory(value: string): value is VendorCategory {
  return (VENDOR_CATEGORIES as readonly string[]).includes(value) || (LEGACY_CATEGORIES as readonly string[]).includes(value);
}

export function categoryLabel(category: VendorCategory): string {
  return LABELS[category];
}

export function isMusicKind(value: string): value is MusicKind {
  return (MUSIC_KINDS as readonly string[]).includes(value);
}

export function musicKindLabel(kind: MusicKind): string {
  return MUSIC_LABELS[kind];
}
