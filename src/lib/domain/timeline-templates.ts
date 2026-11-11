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

export const BUILTIN_TEMPLATES: TimelineTemplate[] = [
  {
    id: "laique",
    label: "Cérémonie laïque + vin d'honneur + dîner",
    slots: [
      { title: "Préparatifs", startsAt: "14:00", place: "Suite", notes: "" },
      { title: "Cérémonie laïque", startsAt: "16:00", place: "Jardin", notes: "" },
      { title: "Vin d'honneur", startsAt: "17:00", place: "Orangerie", notes: "" },
      { title: "Dîner", startsAt: "20:00", place: "Salle", notes: "" },
      { title: "Ouverture du bal", startsAt: "22:30", place: "Piste", notes: "" },
    ],
  },
  {
    id: "mairie",
    label: "Mairie le matin + réception l'après-midi",
    slots: [
      { title: "Préparatifs", startsAt: "09:00", place: "Maison", notes: "" },
      { title: "Cérémonie civile", startsAt: "11:00", place: "Mairie", notes: "" },
      { title: "Vin d'honneur", startsAt: "12:30", place: "Jardin", notes: "" },
      { title: "Déjeuner", startsAt: "13:30", place: "Salle", notes: "" },
    ],
  },
  {
    id: "soiree",
    label: "Cérémonie civile + cocktail + soirée",
    slots: [
      { title: "Cérémonie civile", startsAt: "15:00", place: "Mairie", notes: "" },
      { title: "Photos", startsAt: "16:00", place: "Jardin", notes: "" },
      { title: "Cocktail", startsAt: "17:30", place: "Terrasse", notes: "" },
      { title: "Dîner", startsAt: "20:00", place: "Salle", notes: "" },
      { title: "Soirée dansante", startsAt: "22:30", place: "Piste", notes: "" },
    ],
  },
];

const TRADE_TEMPLATE: Partial<Record<VendorCategory, string>> = {
  photographer: "laique",
  videographer: "laique",
  caterer: "soiree",
  dj: "soiree",
  venue: "soiree",
  planner: "laique",
  florist: "laique",
  beauty: "laique",
  officiant: "laique",
};

export function builtinTemplate(id: string): TimelineTemplate | null {
  return BUILTIN_TEMPLATES.find((template) => template.id === id) ?? null;
}

export function suggestedTemplateId(category: VendorCategory | null): string {
  if (!category) return "laique";
  return TRADE_TEMPLATE[category] ?? "laique";
}

export function parseTemplateSlots(value: unknown): TemplateSlot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((slot) => {
    if (!slot || typeof slot !== "object") return [];
    const row = slot as Record<string, unknown>;
    if (typeof row.title !== "string" || typeof row.startsAt !== "string") return [];
    return [
      {
        title: row.title,
        startsAt: row.startsAt,
        place: typeof row.place === "string" ? row.place : "",
        notes: typeof row.notes === "string" ? row.notes : "",
      },
    ];
  });
}
