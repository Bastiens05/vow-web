export type ReminderKind = "practical" | "photos" | "guests" | "document" | "signature";

const REMINDER_LABELS: Record<ReminderKind, string> = {
  practical: "Infos pratiques à compléter",
  photos: "Groupes photo à compléter",
  guests: "Invités à compléter",
  document: "Document à déposer",
  signature: "Signature en attente",
};

export function reminderKindLabel(kind: string): string {
  if (kind in REMINDER_LABELS) return REMINDER_LABELS[kind as ReminderKind];
  return "Rappel";
}

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
