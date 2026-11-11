export type AppRole = "vendor" | "couple";

export function canManageTimeline(role: AppRole | null): boolean {
  return role === "vendor";
}

export function canInviteMembers(role: AppRole | null): boolean {
  return role === "vendor" || role === "couple";
}

export function preferredCoupleWedding<T extends { memberRole: string; created_by: string; is_demo: boolean }>(
  weddings: T[],
  userId: string,
): T | null {
  const mine = weddings.filter((wedding) => wedding.memberRole === "couple" && !wedding.is_demo);
  return mine.find((wedding) => wedding.created_by !== userId) ?? mine[0] ?? null;
}

export type DatedWedding = { weddingDate: string | null; isDemo?: boolean };

export function weddingStatus(input: {
  weddingDate: string;
  today: string;
  isDemo: boolean;
  couplePreview: boolean;
  coupleJoined: boolean;
}): string {
  if (input.isDemo) return input.couplePreview ? "Démo · essai mariés" : "Démo";
  const when = input.weddingDate < input.today ? "Passé" : "À venir";
  if (!input.coupleJoined && input.weddingDate >= input.today) return `${when} · couple en attente`;
  return when;
}

export function partitionWeddings<T extends DatedWedding>(
  items: readonly T[],
  today: string,
): { upcoming: T[]; past: T[] } {
  const upcoming = items
    .filter((item) => !item.weddingDate || item.weddingDate >= today)
    .sort((a, b) => {
      if (Boolean(a.isDemo) !== Boolean(b.isDemo)) return a.isDemo ? 1 : -1;
      return (a.weddingDate ?? "9999-12-31").localeCompare(b.weddingDate ?? "9999-12-31");
    });
  const past = items
    .filter((item) => item.weddingDate !== null && item.weddingDate < today)
    .sort((a, b) => (b.weddingDate ?? "").localeCompare(a.weddingDate ?? ""));
  return { upcoming, past };
}
