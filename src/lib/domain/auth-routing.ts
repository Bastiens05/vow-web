export type SpaceKind = "vendor" | "couple";

export function isValidEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());
}

export function landingFor(input: {
  role: "vendor" | "couple";
  hasVendorProfile: boolean;
  weddingId: string | null;
  hasCoupleMembership: boolean;
  lastSpace: SpaceKind | null;
  nextPath: string;
  onboard: boolean;
}): string {
  if (input.nextPath.startsWith("/invitation/")) return input.nextPath;
  const both = input.role === "vendor" && input.hasCoupleMembership && Boolean(input.weddingId);
  if (both && input.lastSpace === "couple" && input.weddingId) return `/mariage/${input.weddingId}`;
  if (input.onboard && input.role === "vendor" && !input.hasVendorProfile) return "/bienvenue";
  if (input.role === "couple") return input.weddingId ? `/mariage/${input.weddingId}` : "/espace";
  return "/espace";
}

export function showSpaceSwitcher(input: { hasVendorSpace: boolean; hasCoupleSpace: boolean }): boolean {
  return input.hasVendorSpace && input.hasCoupleSpace;
}
