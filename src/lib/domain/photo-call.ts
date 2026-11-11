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
