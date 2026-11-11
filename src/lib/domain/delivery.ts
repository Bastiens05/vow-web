import type { VendorCategory } from "./categories";

const STEPS: Partial<Record<VendorCategory, readonly string[]>> = {
  photographer: ["Sauvegarde", "Tri", "Retouche", "Préparation galerie", "Livré"],
  videographer: ["Dérushage", "Montage", "Étalonnage", "Musique", "Livré"],
};

export function deliverySteps(category: VendorCategory | null): readonly string[] {
  if (category && STEPS[category]) return STEPS[category];
  return ["Préparation", "En cours", "Livré"];
}

export function promisedDate(weddingDate: string, daysAfter: number): string {
  const date = new Date(`${weddingDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + daysAfter);
  return date.toISOString().slice(0, 10);
}

export function atRisk(promisedOn: string, delivered: boolean, today: string): boolean {
  if (delivered) return false;
  return promisedOn <= today;
}
