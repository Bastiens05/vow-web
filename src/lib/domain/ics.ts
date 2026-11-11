export type CalEvent = {
  uid: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
};

function fold(value: string): string {
  return value.replaceAll(/\r?\n/g, " ").replaceAll(",", "\\,").replaceAll(";", "\\;");
}

function stamp(value: string, allDay: boolean): string {
  if (allDay) return value.replaceAll("-", "").slice(0, 8);
  return value.replaceAll("-", "").replaceAll(":", "");
}

export function renderIcs(events: CalEvent[]): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VOW//Calendrier//FR", "CALSCALE:GREGORIAN"];
  for (const event of events) {
    lines.push("BEGIN:VEVENT", `UID:${fold(event.uid)}`, `SUMMARY:${fold(event.title)}`);
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${stamp(event.start, true)}`);
    } else {
      lines.push(`DTSTART:${stamp(event.start, false)}`);
      lines.push(`DTEND:${stamp(event.end ?? event.start, false)}`);
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function parseEvents(value: unknown): CalEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.uid !== "string" || typeof row.title !== "string" || typeof row.start !== "string") return [];
    return [
      {
        uid: row.uid,
        title: row.title,
        start: row.start,
        end: typeof row.end === "string" ? row.end : null,
        allDay: row.allDay === true,
      },
    ];
  });
}
