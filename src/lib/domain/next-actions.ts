export type NextAction = {
  id: string;
  label: string;
  href: string;
};

export function daysUntil(weddingDate: string, today: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weddingDate) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;
  const start = Date.parse(`${today}T00:00:00Z`);
  const end = Date.parse(`${weddingDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round((end - start) / 86_400_000);
}

export function heroCountdown(days: number | null): { figure: string; caption: string } {
  if (days === null) return { figure: "—", caption: "Date à confirmer" };
  if (days > 0) return { figure: `J-${days}`, caption: "avant le grand jour" };
  if (days === 0) return { figure: "C'est le jour J", caption: "aujourd'hui" };
  return { figure: "Mariage passé", caption: "" };
}

export function countdownLabel(days: number | null): string {
  if (days === null) return "Date à confirmer";
  if (days > 1) return `J-${days}`;
  if (days === 1) return "C'est demain";
  if (days === 0) return "C'est aujourd'hui";
  return "Le jour est passé";
}

export function coupleNextActions(input: {
  weddingId: string;
  hasPractical: boolean;
  needsPhotos: boolean;
  hasPhotos: boolean;
  needsGuests: boolean;
  hasGuests: boolean;
  hasTimeline: boolean;
  pendingSignature: boolean;
  hasDocument: boolean;
}): NextAction[] {
  const base = `/mariage/${input.weddingId}`;
  const actions: NextAction[] = [];
  if (input.pendingSignature) {
    actions.push({ id: "signature", label: "Signer le contrat", href: `${base}/documents` });
  }
  if (!input.hasPractical) {
    actions.push({ id: "practical", label: "Renseigner les infos pratiques", href: `${base}/pratique` });
  }
  if (input.needsPhotos && !input.hasPhotos) {
    actions.push({ id: "photos", label: "Lister les photos de groupe", href: `${base}/documents#photos` });
  }
  if (input.needsGuests && !input.hasGuests) {
    actions.push({ id: "guests", label: "Noter les invités et les régimes", href: `${base}/documents#guests` });
  }
  if (!input.hasTimeline) {
    actions.push({ id: "timeline", label: "Poser le programme du jour", href: `${base}/jour` });
  }
  if (!input.hasDocument && !input.pendingSignature) {
    actions.push({ id: "document", label: "Déposer un document", href: `${base}/documents` });
  }
  return actions.slice(0, 3);
}
