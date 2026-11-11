export function renderOffer(body: string, values: { prenoms: string; date: string; lieu: string }): string {
  return body
    .replaceAll("{prenoms}", values.prenoms)
    .replaceAll("{date_mariage}", values.date)
    .replaceAll("{lieu}", values.lieu);
}

export function offerDate(weddingDate: string, monthsAfter: number): string {
  const date = new Date(`${weddingDate}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + monthsAfter);
  return date.toISOString().slice(0, 10);
}

export function canSend(template: { enabled: boolean; require_review: boolean }, status: string): boolean {
  if (!template.enabled) return false;
  if (template.require_review && status !== "approved") return false;
  return status === "approved" || status === "queued";
}
