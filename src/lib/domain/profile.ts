import { VENDOR_CATEGORIES, type VendorCategory } from "./categories";

export type ProfileField = {
  key: string;
  label: string;
  hint?: string;
  trades: readonly VendorCategory[];
};

const ALL = VENDOR_CATEGORIES;

export const PROFILE_FIELDS: readonly ProfileField[] = [
  { key: "guest_adults", label: "Nombre d'adultes", trades: ["caterer", "venue", "planner", "photographer", "videographer", "officiant", "florist", "dj", "beauty", "other"] },
  { key: "guest_children", label: "Nombre d'enfants", trades: ["caterer", "venue", "planner"] },
  { key: "diets", label: "Allergies et régimes", hint: "Une ligne par contrainte.", trades: ["caterer", "planner"] },
  { key: "ceremony_address", label: "Adresse de la cérémonie", trades: ALL },
  { key: "reception_address", label: "Adresse de la réception", trades: ALL },
  { key: "prep_address", label: "Adresse des préparatifs", trades: ["photographer", "videographer", "beauty", "planner"] },
  { key: "ceremony_time", label: "Heure de la cérémonie", trades: ALL },
  { key: "dinner_time", label: "Heure du dîner", trades: ["caterer", "dj", "venue", "planner", "photographer", "videographer"] },
  { key: "party_end", label: "Fin de la soirée", trades: ["dj", "venue", "planner"] },
  { key: "first_dance", label: "Première danse", trades: ["dj", "photographer", "videographer", "planner"] },
  { key: "music_avoid", label: "Musiques à éviter", trades: ["dj", "planner"] },
  { key: "color_palette", label: "Palette de couleurs", trades: ["florist", "planner", "beauty"] },
  { key: "bouquet", label: "Bouquet gardé ou lancé", trades: ["florist", "photographer", "planner"] },
  { key: "key_contacts", label: "Contacts utiles", trades: ALL },
  { key: "on_site_contact", label: "Contact sur place", trades: ["venue", "planner", "photographer", "caterer", "dj"] },
  { key: "access_time", label: "Heure d'accès au lieu", trades: ["venue", "photographer", "videographer", "florist", "dj", "caterer", "planner"] },
  { key: "story", label: "Votre rencontre", trades: ["officiant", "planner"] },
  { key: "reading", label: "Lecture prévue", trades: ["officiant", "planner"] },
  { key: "vows", label: "Vœux déjà écrits", trades: ["officiant", "planner"] },
  { key: "drone", label: "Drone autorisé", trades: ["videographer", "venue", "planner"] },
  { key: "speech_film", label: "Discours filmé en entier", trades: ["videographer", "planner"] },
  { key: "makeup_time", label: "Heure du maquillage", trades: ["beauty", "photographer", "planner"] },
  { key: "trial_done", label: "Essai coiffure ou maquillage", trades: ["beauty", "planner"] },
  { key: "must_happen", label: "Ce qui doit bien se passer", trades: ["planner"] },
  { key: "keep_simple", label: "Ce qui doit rester simple", trades: ["planner"] },
  { key: "emergency", label: "Qui prévenir en cas d'imprévu", trades: ["planner", "venue"] },
];

export type ProfileFacts = Record<string, string>;

export function fieldsForTrade(category: VendorCategory | null): ProfileField[] {
  if (!category || category === "planner") return [...PROFILE_FIELDS];
  return PROFILE_FIELDS.filter((field) => field.trades.includes(category));
}

export function filledRatio(facts: ProfileFacts, category: VendorCategory | null): { filled: number; total: number; percent: number } {
  const fields = fieldsForTrade(category);
  const filled = fields.filter((field) => (facts[field.key] ?? "").trim().length > 0).length;
  const total = fields.length;
  return { filled, total, percent: total === 0 ? 0 : Math.round((filled / total) * 100) };
}

export function visibleFacts(facts: ProfileFacts, category: VendorCategory | null): ProfileFacts {
  const allowed = new Set(fieldsForTrade(category).map((field) => field.key));
  return Object.fromEntries(Object.entries(facts).filter(([key, value]) => allowed.has(key) && value.trim().length > 0));
}

const QUESTION_FIELD: Record<string, string> = {
  "Où se passent les préparatifs ?": "prep_address",
  "À quelle heure commence la cérémonie ?": "ceremony_time",
  "Combien d'adultes et d'enfants sont prévus ?": "guest_adults",
  "Quels régimes ou allergies faut-il prévoir ?": "diets",
  "À quelle heure le dîner est-il servi ?": "dinner_time",
  "Quelle est la chanson de la première danse ?": "first_dance",
  "Quelles musiques faut-il éviter ?": "music_avoid",
  "À quelle heure la soirée doit-elle se terminer ?": "party_end",
  "Quelle palette de couleurs voulez-vous ?": "color_palette",
  "Où se déroule la cérémonie ?": "ceremony_address",
  "Le bouquet doit-il être gardé ou lancé ?": "bouquet",
  "À quelle heure pouvez-vous accéder au lieu ?": "access_time",
  "Quelle est l'adresse de la cérémonie, et celle de la réception ?": "ceremony_address",
  "Qui est le contact sur place le jour J ?": "on_site_contact",
  "Comment vous êtes-vous rencontrés, en quelques lignes ?": "story",
  "Y a-t-il une lecture prévue ?": "reading",
  "Les vœux sont-ils déjà écrits ?": "vows",
  "Y a-t-il un lieu où le drone est interdit ?": "drone",
  "Souhaitez-vous un discours filmé en entier ?": "speech_film",
  "À quelle heure commence le maquillage ?": "makeup_time",
  "Un essai a-t-il déjà eu lieu ?": "trial_done",
  "Qu'est-ce qui doit absolument bien se passer ?": "must_happen",
  "Qui prévenir en cas d'imprévu ?": "emergency",
  "Qu'est-ce qui doit rester simple ?": "keep_simple",
  "Quels sont les horaires à retenir ?": "ceremony_time",
  "Y a-t-il une contrainte du lieu ?": "access_time",
};

export function factsFromJson(value: unknown): ProfileFacts {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const facts: ProfileFacts = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string") facts[key] = raw;
  }
  return facts;
}

export function missingQuestions(prompts: readonly string[], facts: ProfileFacts): { prompt: string; known: string | null }[] {
  return prompts.map((prompt) => {
    const key = QUESTION_FIELD[prompt];
    const known = key ? (facts[key] ?? "").trim() : "";
    return { prompt, known: known.length > 0 ? known : null };
  });
}
