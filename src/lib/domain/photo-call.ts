import type { VendorCategory } from "@/lib/domain/categories";

export function canComposePhotoGroups(input: {
  role: "vendor" | "couple";
  category: VendorCategory | null;
  actingAsCouple?: boolean;
}): boolean {
  if (input.role === "couple" || input.actingAsCouple) return true;
  return input.category === "planner";
}

export function canCallNextGroup(input: {
  role: "vendor" | "couple";
  category: VendorCategory | null;
  actingAsCouple?: boolean;
}): boolean {
  if (input.role === "couple" || input.actingAsCouple) return true;
  return input.category === "photographer" || input.category === "videographer" || input.category === "planner";
}

export function smsSendingEnabled(): boolean {
  return process.env.SMS_ENABLED === "true";
}

export function callMessage(title: string, place: string): string {
  const where = place.trim() || "l'endroit convenu";
  return `Votre photo est dans 2 minutes, rendez-vous à ${where}. Groupe : ${title}.`;
}

export function nextUncalled<T extends { calledAt: string | null }>(groups: readonly T[]): T | null {
  return groups.find((group) => !group.calledAt) ?? null;
}
