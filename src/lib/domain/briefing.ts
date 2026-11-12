const OPENING: Record<string, string> = {
  officiant: "Vous accompagnez la cérémonie.",
  beauty: "Vous êtes sur la préparation.",
};

export function buildBriefing(input: {
  names: string;
  pronunciation: string;
  people: string;
  notes: string;
  steps: string[];
  address: string;
  weather: string;
  trade: string;
  heard: boolean;
}): string {
  const lines = [
    OPENING[input.trade] ?? "Voici votre briefing.",
    `Les mariés : ${input.names}.`,
  ];
  if (input.pronunciation) lines.push(`Prononciation : ${input.pronunciation}.`);
  if (input.people) lines.push(`Personnes clés : ${input.people}.`);
  if (input.notes) lines.push(`Points d'attention : ${input.notes}.`);
  if (input.steps.length > 0) lines.push(`Vos trois prochaines étapes : ${input.steps.slice(0, 3).join(", ")}.`);
  lines.push(input.heard ? "Rien de nouveau depuis votre dernière écoute." : "Première écoute de ce briefing.");
  if (input.address) lines.push(`Adresse : ${input.address}.`);
  if (input.weather) lines.push(input.weather);
  return lines.join(" ");
}
