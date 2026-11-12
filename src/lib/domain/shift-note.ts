export type ShiftChange = { userId: string; title: string; newTime: string };

export function personalShiftNote(changes: readonly ShiftChange[]): string {
  if (changes.length === 0) return "";
  const lines = changes.map((change) => `${change.title} passe à ${change.newTime.slice(0, 5).replace(":", "h")}`);
  const head = changes.length === 1 ? "Un horaire vous concerne." : "Quelques horaires vous concernent.";
  return `${head} ${lines.join(". ")}.`.slice(0, 500);
}
