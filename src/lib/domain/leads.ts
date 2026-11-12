export function splitCoupleNames(input: string): { one: string; oneLast: string; two: string; twoLast: string } {
  const clean = input.trim().replace(/\s+/g, " ");
  const parts = clean.split(/\s+(?:&|et)\s+|\s*&\s*/i).map((part) => part.trim()).filter(Boolean);
  const person = (part: string) => {
    const words = part.split(" ").filter(Boolean);
    if (words.length >= 2) {
      const last = words[words.length - 1] ?? "";
      const first = words.slice(0, -1).join(" ");
      if (first.length >= 2 && last.length >= 2) return { first: first.slice(0, 80), last: last.slice(0, 80) };
    }
    return { first: part.slice(0, 80), last: "" };
  };
  if (parts.length >= 2 && parts[0].length >= 2 && parts[1].length >= 2) {
    const one = person(parts[0]);
    const two = person(parts.slice(1).join(" "));
    return { one: one.first, oneLast: one.last, two: two.first, twoLast: two.last };
  }
  if (clean.length >= 2) {
    const one = person(clean);
    return { one: one.first, oneLast: one.last, two: "À venir", twoLast: "" };
  }
  return { one: "Couple", oneLast: "", two: "À venir", twoLast: "" };
}

export function leadStatusLabel(status: string): string {
  if (status === "en_discussion") return "En discussion";
  if (status === "gagnee") return "Gagnée";
  if (status === "perdue") return "Perdue";
  return "Nouvelle";
}
