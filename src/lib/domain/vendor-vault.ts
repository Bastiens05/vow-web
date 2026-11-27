export const VENDOR_VAULT_CATEGORIES = [
  { id: "rc_pro", label: "Assurance RC Pro" },
  { id: "kbis", label: "Kbis" },
  { id: "tech", label: "Fiche technique" },
  { id: "cgv", label: "CGV" },
  { id: "other", label: "Autre" },
] as const;

export type VendorVaultCategory = (typeof VENDOR_VAULT_CATEGORIES)[number]["id"];

export function isVendorVaultCategory(value: string): value is VendorVaultCategory {
  return VENDOR_VAULT_CATEGORIES.some((item) => item.id === value);
}

export function removalWarning(audience: "couple" | "vendor" | "both"): string {
  if (audience === "vendor") return "Ce document est partagé. Le retirer l'enlève aussi chez le prestataire.";
  if (audience === "both") return "Ce document est partagé. Le retirer l'enlève aussi chez le couple et le prestataire.";
  return "Ce document est partagé. Le retirer l'enlève aussi chez le couple.";
}

export function shareAudience(recipients: Array<string | null>): "couple" | "vendor" | "both" | null {
  if (recipients.length === 0) return null;
  const couple = recipients.some((id) => id == null);
  const vendor = recipients.some((id) => id != null);
  if (couple && vendor) return "both";
  if (vendor) return "vendor";
  return "couple";
}

export function vendorVaultCategoryLabel(value: string): string {
  return VENDOR_VAULT_CATEGORIES.find((item) => item.id === value)?.label ?? "Autre";
}

export type VaultFreshness = "none" | "ok" | "soon" | "expired";

function shiftDate(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** How close a vault file is to its optional expiry, using calendar dates. */
export function vaultFreshness(expiresOn: string | null, alertDays: number, today: string): VaultFreshness {
  if (!expiresOn) return "none";
  if (expiresOn < today) return "expired";
  const windowStart = shiftDate(expiresOn, -Math.max(alertDays, 0));
  if (today >= windowStart) return "soon";
  return "ok";
}

export function shareNotice(vendorName: string, title: string): string {
  return `${vendorName} a partagé ${title}.`;
}

/** New files are not sent to future weddings unless the vendor opts in. */
export function defaultAutoShare(): boolean {
  return false;
}
