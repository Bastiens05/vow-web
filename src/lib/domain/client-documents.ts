import type { VendorCategory } from "@/lib/domain/categories";

export type RequestStatus = "needed" | "sent" | "validated" | "correction";

export function isRequestStatus(value: string): value is RequestStatus {
  return value === "needed" || value === "sent" || value === "validated" || value === "correction";
}

export type DocumentTemplate = {
  title: string;
  note: string;
  required: boolean;
  offsetDays: number | null;
};

const SUGGESTIONS: Record<VendorCategory, DocumentTemplate[]> = {
  photographer: [
    { title: "Liste des proches à photographier", note: "Prénoms et lien avec les mariés.", required: false, offsetDays: -21 },
    { title: "Plan d'accès au lieu", note: "Adresse, parking et horaire d'arrivée.", required: true, offsetDays: -14 },
  ],
  videographer: [
    { title: "Déroulé de la journée", note: "Les moments à filmer, avec les horaires.", required: true, offsetDays: -21 },
    { title: "Plan d'accès au lieu", note: "", required: true, offsetDays: -14 },
  ],
  dj: [
    { title: "Liste des musiques souhaitées", note: "Entrée, ouverture de bal, et titres à éviter.", required: false, offsetDays: -21 },
    { title: "Plan d'accès et contraintes sonores", note: "", required: true, offsetDays: -14 },
  ],
  florist: [
    { title: "Plan de table", note: "Pour placer les compositions.", required: false, offsetDays: -14 },
    { title: "Inspiration couleurs", note: "", required: false, offsetDays: -30 },
  ],
  caterer: [
    { title: "Régimes et allergies", note: "Un prénom par ligne.", required: true, offsetDays: -21 },
    { title: "Nombre d'invités confirmés", note: "", required: true, offsetDays: -14 },
  ],
  venue: [
    { title: "Attestation d'assurance", note: "Du prestataire qui installe sur place.", required: false, offsetDays: -30 },
    { title: "Horaires d'accès du lieu", note: "", required: true, offsetDays: -21 },
  ],
  planner: [
    { title: "Liste des prestataires retenus", note: "Nom, métier et téléphone.", required: true, offsetDays: -60 },
    { title: "Budget validé", note: "", required: false, offsetDays: -45 },
  ],
  beauty: [
    { title: "Horaires de préparation", note: "Lieu et heure à laquelle commencer.", required: true, offsetDays: -14 },
  ],
  officiant: [
    { title: "Texte de cérémonie", note: "Vœux, lectures, ou une page blanche si vous voulez de l'aide.", required: false, offsetDays: -30 },
  ],
  other: [
    { title: "Informations utiles pour le jour J", note: "", required: false, offsetDays: -14 },
  ],
};

/** Ideas for a trade. Nothing here is saved until the vendor adds it. */
export function documentSuggestions(category: VendorCategory | null): DocumentTemplate[] {
  if (!category) return [];
  return SUGGESTIONS[category] ?? [];
}

/** The couple only sees what the vendor actually saved. */
export function savedRequests<T>(templates: readonly T[]): T[] {
  return [...templates];
}

export function formatOffset(days: number | null): string | null {
  if (days === null) return null;
  if (days === 0) return "Jour J";
  if (days < 0) return `J${days}`;
  return `J+${days}`;
}

export function dueOn(weddingDate: string | null, offsetDays: number | null): string | null {
  if (!weddingDate || offsetDays === null) return null;
  const date = new Date(`${weddingDate}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function requestStatusLabel(status: RequestStatus): string {
  if (status === "sent") return "Envoyé";
  if (status === "validated") return "Validé";
  if (status === "correction") return "À corriger";
  return "À fournir";
}

export function moveItem<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const next = index + direction;
  if (index < 0 || index >= items.length || next < 0 || next >= items.length) return [...items];
  const copy = [...items];
  const [item] = copy.splice(index, 1);
  if (item === undefined) return [...items];
  copy.splice(next, 0, item);
  return copy;
}

export function parseOffset(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const days = Number(trimmed);
  if (!Number.isInteger(days) || days < -365 || days > 365) return Number.NaN;
  return days;
}
