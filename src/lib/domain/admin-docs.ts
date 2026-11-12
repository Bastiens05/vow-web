export const DOC_KINDS = [
  { id: "rc_pro", label: "RC Pro" },
  { id: "kbis", label: "Kbis / SIRENE" },
  { id: "urssaf", label: "Vigilance URSSAF" },
  { id: "gear", label: "Assurance matériel" },
  { id: "sacem", label: "SACEM / Spré" },
  { id: "haccp", label: "HACCP" },
  { id: "other", label: "Autre" },
] as const;

export type DocStatus = "valid" | "soon" | "expired";

export function docStatus(expiresOn: string | null, today: string): DocStatus {
  if (!expiresOn) return "valid";
  if (expiresOn < today) return "expired";
  const limit = new Date(`${today}T12:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + 30);
  if (expiresOn <= limit.toISOString().slice(0, 10)) return "soon";
  return "valid";
}
