export const VAULT_CHECKLIST = [
  { kind: "identity", label: "Pièces d'identité" },
  { kind: "rib", label: "RIB" },
  { kind: "insurance", label: "Attestation d'assurance" },
  { kind: "contract", label: "Contrats" },
  { kind: "access", label: "Plan d'accès" },
  { kind: "address", label: "Justificatif de domicile" },
] as const;

export type VaultKind = (typeof VAULT_CHECKLIST)[number]["kind"] | "custom";
