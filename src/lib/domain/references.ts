export function publicCoupleName(choice: string | null): string {
  return choice?.trim() ? choice.trim() : "Un couple";
}

export function venueAggregate(rows: { venue_name: string }[]): { venue: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.venue_name, (counts.get(row.venue_name) ?? 0) + 1);
  return [...counts.entries()].map(([venue, count]) => ({ venue, count })).sort((a, b) => b.count - a.count);
}
