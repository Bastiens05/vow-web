export type ReminderKind = "practical" | "photos" | "guests" | "document" | "signature";

export function reminderMilestone(daysUntilWedding: number): 60 | 30 | 14 | null {
  if (daysUntilWedding >= 31 && daysUntilWedding <= 60) return 60;
  if (daysUntilWedding >= 15 && daysUntilWedding <= 30) return 30;
  if (daysUntilWedding >= 1 && daysUntilWedding <= 14) return 14;
  return null;
}

export function dueReminderKinds(input: {
  hasPractical: boolean;
  needsPhotos: boolean;
  hasPhotos: boolean;
  needsGuests: boolean;
  hasGuests: boolean;
  hasDocument: boolean;
  pendingSignature: boolean;
}): ReminderKind[] {
  const kinds: ReminderKind[] = [];
  if (!input.hasPractical) kinds.push("practical");
  if (input.needsPhotos && !input.hasPhotos) kinds.push("photos");
  if (input.needsGuests && !input.hasGuests) kinds.push("guests");
  if (!input.hasDocument) kinds.push("document");
  if (input.pendingSignature) kinds.push("signature");
  return kinds;
}
