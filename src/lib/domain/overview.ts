export function countLabel(count: number, singular: string, plural: string, empty = "Aucun"): string {
  if (count <= 0) return empty;
  return `${count} ${count > 1 ? plural : singular}`;
}

export function questionStatus(answers: string[]): string {
  const answered = answers.filter((answer) => answer.trim().length > 0).length;
  if (answered === 0) return "À compléter";
  return countLabel(answered, "réponse", "réponses");
}

export function moneyStatus(invoices: string[], quoteCount: number): string {
  const pending = invoices.filter((status) => status === "pending").length;
  if (pending > 0) return countLabel(pending, "facture en attente", "factures en attente");
  if (invoices.length > 0 && invoices.every((status) => status === "paid")) return "Payé";
  if (quoteCount > 0) return countLabel(quoteCount, "devis", "devis");
  return "Aucun";
}

export function sheetStatus(filled: boolean): string {
  return filled ? "Complétée" : "À compléter";
}
