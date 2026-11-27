export type GuestSeat = { fullName: string; tableLabel: string };

export type PlannedGroup = { title: string; people: string };

/** One photo group per table that already has guests. Empty names are ignored. */
export function photoGroupsFromGuests(guests: GuestSeat[]): PlannedGroup[] {
  const tables = new Map<string, string[]>();
  const loose: string[] = [];
  for (const guest of guests) {
    const name = guest.fullName.trim();
    if (!name) continue;
    const table = guest.tableLabel.trim();
    if (!table) {
      loose.push(name);
      continue;
    }
    const people = tables.get(table) ?? [];
    people.push(name);
    tables.set(table, people);
  }
  const groups = [...tables.entries()].map(([table, people]) => ({
    title: /^table\b/i.test(table) ? table : `Table ${table}`,
    people: people.join(", "),
  }));
  if (loose.length > 0) groups.push({ title: "Sans table", people: loose.join(", ") });
  return groups;
}

export function coupleSessionSlot(slots: { title: string; startsAt: string }[]): { title: string; startsAt: string } | null {
  return (
    slots.find((slot) => /s[ée]ance\s+couple|photos?\s+du\s+couple|portrait\s+du\s+couple/i.test(slot.title)) ?? null
  );
}
