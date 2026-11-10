export type AppRole = "vendor" | "couple";

export function canManageTimeline(role: AppRole | null): boolean {
  return role === "vendor";
}

export function canInviteMembers(role: AppRole | null): boolean {
  return role === "vendor";
}

export type DatedWedding = { weddingDate: string | null };

export function partitionWeddings<T extends DatedWedding>(
  items: readonly T[],
  today: string,
): { upcoming: T[]; past: T[] } {
  const upcoming = items
    .filter((item) => !item.weddingDate || item.weddingDate >= today)
    .sort((a, b) => (a.weddingDate ?? "9999-12-31").localeCompare(b.weddingDate ?? "9999-12-31"));
  const past = items
    .filter((item) => item.weddingDate !== null && item.weddingDate < today)
    .sort((a, b) => (b.weddingDate ?? "").localeCompare(a.weddingDate ?? ""));
  return { upcoming, past };
}
