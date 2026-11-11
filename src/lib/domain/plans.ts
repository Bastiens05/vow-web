export type VendorPlan = "essentiel" | "pro" | "studio";

export const VENDOR_PLANS: readonly VendorPlan[] = ["essentiel", "pro", "studio"];

/** The only price shown anywhere. Pro and Studio stay unpublished. */
export const PUBLIC_PLAN = {
  id: "essentiel" as const,
  cents: 2999,
  label: "Essentiel · 29,99 € TTC / mois",
};

const FEATURES: Record<VendorPlan, readonly string[]> = {
  essentiel: ["core"],
  pro: ["core", "reports"],
  studio: ["core", "reports", "multi_site"],
};

export function isVendorPlan(value: string): value is VendorPlan {
  return (VENDOR_PLANS as readonly string[]).includes(value);
}

export function planAllows(plan: VendorPlan, feature: string): boolean {
  return FEATURES[plan].includes(feature);
}

export function coupleIsFree(): true {
  return true;
}
