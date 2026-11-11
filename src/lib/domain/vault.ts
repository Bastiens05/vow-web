import type { VendorCategory } from "@/lib/domain/categories";

export const VAULT_CHECKLIST = [
  { kind: "identity", label: "Pièces d'identité" },
  { kind: "rib", label: "RIB" },
  { kind: "insurance", label: "Attestation d'assurance" },
  { kind: "contract", label: "Contrats" },
  { kind: "access", label: "Plan d'accès" },
  { kind: "address", label: "Justificatif de domicile" },
] as const;

export type VaultKind = (typeof VAULT_CHECKLIST)[number]["kind"] | "custom";

const REQUESTS: Partial<Record<VendorCategory, readonly string[]>> = {
  photographer: ["identity", "contract", "access"],
  videographer: ["identity", "contract", "access"],
  caterer: ["identity", "rib", "address"],
  dj: ["identity", "contract", "access"],
  florist: ["identity", "access"],
  venue: ["identity", "insurance", "address"],
  planner: ["identity", "contract", "insurance"],
  beauty: ["identity", "access"],
  officiant: ["identity", "contract"],
  other: ["identity"],
};

export function requestsFor(category: VendorCategory | null): { kind: string; label: string }[] {
  const kinds = (category && REQUESTS[category]) || REQUESTS.other || [];
  return kinds.map((kind) => ({
    kind,
    label: VAULT_CHECKLIST.find((item) => item.kind === kind)?.label ?? kind,
  }));
}
