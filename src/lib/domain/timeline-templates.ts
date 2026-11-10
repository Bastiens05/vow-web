import type { VendorCategory } from "./categories";

export type TemplateSlot = {
  title: string;
  startsAt: string;
  place: string;
  notes: string;
};

export type TimelineTemplate = {
  id: string;
  label: string;
  slots: TemplateSlot[];
};

const general: TemplateSlot[] = [
  { title: "Préparatifs", startsAt: "14:00", place: "Suite", notes: "" },
  { title: "Accueil des invités", startsAt: "15:30", place: "Entrée", notes: "" },
  { title: "Cérémonie", startsAt: "16:00", place: "", notes: "" },
  { title: "Cocktail", startsAt: "17:30", place: "", notes: "" },
  { title: "Dîner", startsAt: "20:00", place: "Salle", notes: "" },
  { title: "Ouverture du bal", startsAt: "23:00", place: "Piste", notes: "" },
];

export const BUILTIN_TEMPLATES: TimelineTemplate[] = [
  { id: "general", label: "Journée type", slots: general },
  {
    id: "photographer",
    label: "Photographe",
    slots: [
      { title: "Préparatifs photo", startsAt: "13:30", place: "Suite", notes: "Lumière naturelle, détails, portraits." },
      { title: "Cérémonie", startsAt: "16:00", place: "", notes: "Arrivée, vœux, sortie." },
      { title: "Photos de groupe", startsAt: "17:00", place: "Jardin", notes: "Familles puis amis." },
      { title: "Cocktail", startsAt: "17:30", place: "", notes: "Reportage libre." },
      { title: "Dîner et ouverture du bal", startsAt: "20:00", place: "Salle", notes: "Entrée, discours, première danse." },
    ],
  },
  {
    id: "videographer",
    label: "Vidéaste",
    slots: [
      { title: "Préparatifs", startsAt: "13:30", place: "Suite", notes: "" },
      { title: "Cérémonie", startsAt: "16:00", place: "", notes: "Deux axes, son de la cérémonie." },
      { title: "Cocktail", startsAt: "17:30", place: "", notes: "" },
      { title: "Discours", startsAt: "21:00", place: "Salle", notes: "" },
      { title: "Ouverture du bal", startsAt: "23:00", place: "Piste", notes: "" },
    ],
  },
  {
    id: "caterer",
    label: "Traiteur",
    slots: [
      { title: "Mise en place", startsAt: "15:00", place: "Cuisine", notes: "" },
      { title: "Cocktail dînatoire", startsAt: "17:30", place: "", notes: "Pièces cocktail." },
      { title: "Entrée en salle", startsAt: "20:00", place: "Salle", notes: "" },
      { title: "Plat", startsAt: "21:00", place: "Salle", notes: "" },
      { title: "Pièce montée", startsAt: "23:30", place: "Salle", notes: "" },
    ],
  },
  {
    id: "dj",
    label: "DJ",
    slots: [
      { title: "Installation et balances", startsAt: "15:00", place: "Salle", notes: "" },
      { title: "Cocktail", startsAt: "17:30", place: "", notes: "Fond sonore." },
      { title: "Entrée en salle", startsAt: "20:00", place: "Salle", notes: "" },
      { title: "Ouverture du bal", startsAt: "23:00", place: "Piste", notes: "" },
      { title: "Fin de soirée", startsAt: "02:00", place: "Piste", notes: "" },
    ],
  },
  {
    id: "venue",
    label: "Lieu",
    slots: [
      { title: "Ouverture du lieu", startsAt: "12:00", place: "", notes: "Remise des clés." },
      { title: "Cérémonie", startsAt: "16:00", place: "Jardin", notes: "" },
      { title: "Cocktail", startsAt: "17:30", place: "Orangerie", notes: "" },
      { title: "Dîner", startsAt: "20:00", place: "Salle", notes: "" },
      { title: "Fermeture", startsAt: "04:00", place: "", notes: "" },
    ],
  },
  {
    id: "planner",
    label: "Wedding planner",
    slots: general.map((slot) => ({ ...slot, notes: slot.notes || "Point avec les prestataires." })),
  },
  {
    id: "florist",
    label: "Fleuriste",
    slots: [
      { title: "Livraison des bouquets", startsAt: "11:00", place: "Suite", notes: "" },
      { title: "Installation cérémonie", startsAt: "14:00", place: "Jardin", notes: "" },
      { title: "Installation des tables", startsAt: "16:30", place: "Salle", notes: "" },
    ],
  },
  {
    id: "beauty",
    label: "Coiffure et maquillage",
    slots: [
      { title: "Maquillage mariée", startsAt: "10:00", place: "Suite", notes: "" },
      { title: "Coiffure", startsAt: "12:00", place: "Suite", notes: "" },
      { title: "Retouches", startsAt: "15:30", place: "Suite", notes: "" },
    ],
  },
  {
    id: "officiant",
    label: "Officiant",
    slots: [
      { title: "Brief avec le couple", startsAt: "15:00", place: "", notes: "" },
      { title: "Cérémonie", startsAt: "16:00", place: "", notes: "Entrée, textes, vœux, sortie." },
    ],
  },
];

const TRADE_TEMPLATE: Partial<Record<VendorCategory, string>> = {
  photographer: "photographer",
  videographer: "videographer",
  caterer: "caterer",
  dj: "dj",
  venue: "venue",
  planner: "planner",
  florist: "florist",
  beauty: "beauty",
  officiant: "officiant",
};

export function builtinTemplate(id: string): TimelineTemplate | null {
  return BUILTIN_TEMPLATES.find((template) => template.id === id) ?? null;
}

export function suggestedTemplateId(category: VendorCategory | null): string {
  if (!category) return "general";
  return TRADE_TEMPLATE[category] ?? "general";
}
