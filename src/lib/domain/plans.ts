export type VendorPlan = "essentiel" | "pro" | "studio";

export const VENDOR_PLANS: readonly VendorPlan[] = ["essentiel", "pro", "studio"];

const RANK: Record<VendorPlan, number> = { essentiel: 0, pro: 1, studio: 2 };

export type FeatureKey =
  | "core"
  | "guest_live"
  | "speech_subtitles"
  | "cashflow"
  | "tech_sheet"
  | "crew"
  | "delivery"
  | "admin_docs"
  | "references"
  | "anniversary"
  | "vocal_briefing";

const MINIMUM: Record<FeatureKey, VendorPlan | "couple"> = {
  core: "essentiel",
  guest_live: "couple",
  speech_subtitles: "pro",
  cashflow: "pro",
  tech_sheet: "essentiel",
  crew: "studio",
  delivery: "essentiel",
  admin_docs: "essentiel",
  references: "pro",
  anniversary: "pro",
  vocal_briefing: "pro",
};

export const PLAN_OFFERS = [
  { id: "essentiel" as const, cents: 2999, label: "Essentiel", price: "29,99 € / mois" },
  { id: "pro" as const, cents: 4900, label: "Pro", price: "49 € / mois" },
  { id: "studio" as const, cents: 8900, label: "Studio", price: "89 € / mois" },
];

export const PUBLIC_PLAN = PLAN_OFFERS[0];

export function isVendorPlan(value: string): value is VendorPlan {
  return (VENDOR_PLANS as readonly string[]).includes(value);
}

export function planIncludes(plan: VendorPlan, required: VendorPlan): boolean {
  return RANK[plan] >= RANK[required];
}

export type VendorAccount = {
  role: "vendor" | "couple";
  plan?: VendorPlan | null;
};

/** Server-side gate. Studio includes Pro, which includes Essentiel. Couples stay free. */
export function hasFeature(account: VendorAccount, featureKey: FeatureKey): boolean {
  const minimum = MINIMUM[featureKey];
  if (minimum === "couple") return account.role === "couple";
  if (account.role === "couple") return false;
  const plan = account.plan && isVendorPlan(account.plan) ? account.plan : "essentiel";
  return planIncludes(plan, minimum);
}

export function featurePlanLabel(featureKey: FeatureKey): "Pro" | "Studio" | null {
  const minimum = MINIMUM[featureKey];
  if (minimum === "pro") return "Pro";
  if (minimum === "studio") return "Studio";
  return null;
}

export function coupleIsFree(): true {
  return true;
}

const FLAGS: Partial<Record<FeatureKey, string | undefined>> = {
  cashflow: process.env.FEATURE_CASHFLOW,
  tech_sheet: process.env.FEATURE_TECH_SHEET,
  crew: process.env.FEATURE_CREW,
  delivery: process.env.FEATURE_DELIVERY,
  admin_docs: process.env.FEATURE_ADMIN_DOCS,
  references: process.env.FEATURE_REFERENCES,
  anniversary: process.env.FEATURE_ANNIVERSARY,
  vocal_briefing: process.env.FEATURE_VOCAL_BRIEFING,
  speech_subtitles: process.env.FEATURE_SUBTITLES,
};

export function featureEnabled(featureKey: FeatureKey): boolean {
  if (featureKey === "core" || featureKey === "guest_live") return true;
  return FLAGS[featureKey] === "true";
}

/** Copy shared by /abonnement and the public pricing section. */
export const FEATURE_SUMMARIES: Record<Exclude<FeatureKey, "core" | "guest_live">, { title: string; text: string }> = {
  tech_sheet: {
    title: "Fiche technique croisée",
    text: "Accès, puissance, stationnement. Le lieu et les prestataires lisent la même fiche.",
  },
  delivery: {
    title: "Livraison sous contrôle",
    text: "Les livraisons sont suivies, sans annonce automatique de retard.",
  },
  admin_docs: {
    title: "Dossier administratif",
    text: "Le dossier pro reste privé, partagé seulement si vous l'ouvrez.",
  },
  cashflow: {
    title: "Trésorerie de saison",
    text: "Encaissements et charges de la saison, au même endroit.",
  },
  references: {
    title: "Références prouvées",
    text: "Des références publiées seulement après confirmation du couple.",
  },
  anniversary: {
    title: "Relance d'anniversaire",
    text: "Un rappel discret, le moment venu, si vous l'avez relu.",
  },
  vocal_briefing: {
    title: "Briefing vocal",
    text: "Le briefing du jour, au départ, jamais en lecture automatique.",
  },
  speech_subtitles: {
    title: "Sous-titres",
    text: "Les prises de parole sont sous-titrées pour l'équipe qui en a besoin.",
  },
  crew: {
    title: "Équipe volante",
    text: "Les renforts du jour sont visibles, sans mélange avec vos clients.",
  },
};

export const PLAN_SUMMARIES: Record<VendorPlan, string> = {
  essentiel: "La vitrine, le couple, le déroulé, et les outils du jour.",
  pro: "Comprend Essentiel, plus la saison et le suivi des couples.",
  studio: "Comprend Pro, plus l'équipe volante.",
};

export type PlanFeatureSummary = { key: Exclude<FeatureKey, "core" | "guest_live">; title: string; text: string };

export function featuresIncludedIn(plan: VendorPlan): PlanFeatureSummary[] {
  return (Object.keys(FEATURE_SUMMARIES) as PlanFeatureSummary["key"][]).filter((key) =>
    planIncludes(plan, MINIMUM[key] as VendorPlan),
  ).map((key) => ({ key, ...FEATURE_SUMMARIES[key] }));
}

export function featuresIntroducedIn(plan: VendorPlan): PlanFeatureSummary[] {
  return (Object.keys(FEATURE_SUMMARIES) as PlanFeatureSummary["key"][]).filter((key) => MINIMUM[key] === plan).map((key) => ({
    key,
    ...FEATURE_SUMMARIES[key],
  }));
}

export function planLabel(plan: VendorPlan, comped = false): string {
  const offer = PLAN_OFFERS.find((item) => item.id === plan);
  const label = offer?.label ?? "Essentiel";
  return comped && plan === "studio" ? `${label} (offert)` : label;
}

export function effectiveVendorPlan(plan: string | null | undefined): VendorPlan {
  return plan && isVendorPlan(plan) ? plan : "essentiel";
}

