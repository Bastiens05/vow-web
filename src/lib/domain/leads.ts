export function splitCoupleNames(input: string): { one: string; two: string } {
  const clean = input.trim().replace(/\s+/g, " ");
  const parts = clean.split(/\s+(?:&|et)\s+|\s*&\s*/i).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2 && parts[0].length >= 2 && parts[1].length >= 2) {
    return { one: parts[0].slice(0, 80), two: parts.slice(1).join(" ").slice(0, 80) };
  }
  if (clean.length >= 2) return { one: clean.slice(0, 80), two: "À venir" };
  return { one: "Couple", two: "À venir" };
}

export function leadStatusLabel(status: string): string {
  if (status === "en_discussion") return "En discussion";
  if (status === "gagnee") return "Gagnée";
  if (status === "perdue") return "Perdue";
  return "Nouvelle";
}
