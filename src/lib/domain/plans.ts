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
