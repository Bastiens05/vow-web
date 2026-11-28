export type VendorSearchHit = {
  businessName: string;
  personName: string;
  category: string;
  discoverable: boolean;
};

/** Strips wildcard characters so a typed query cannot broaden the match. */
export function vendorSearchQuery(raw: string): string {
  return raw.trim().replace(/[%_]/g, "").slice(0, 80);
}

export function matchesVendorSearch(vendor: VendorSearchHit, query: string, category: string): boolean {
  if (!vendor.discoverable) return false;
  if (category && vendor.category !== category) return false;
  const needle = vendorSearchQuery(query).toLocaleLowerCase("fr");
  if (!needle) return true;
  return (
    vendor.businessName.toLocaleLowerCase("fr").includes(needle) ||
    vendor.personName.toLocaleLowerCase("fr").includes(needle)
  );
}
