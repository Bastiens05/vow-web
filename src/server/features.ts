import { hasFeature as allow, type FeatureKey, type VendorAccount, type VendorPlan } from "@/lib/domain/plans";

export type { FeatureKey, VendorAccount };

export function hasFeature(vendorAccount: VendorAccount & { plan?: VendorPlan | null }, featureKey: FeatureKey): boolean {
  return allow(vendorAccount, featureKey);
}
