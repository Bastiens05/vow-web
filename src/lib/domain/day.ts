export function addMinutesToTime(time: string, minutes: number): string {
  const match = /^(\d{2}):(\d{2})/.exec(time);
  if (!match) return time;
  const total = Number(match[1]) * 60 + Number(match[2]) + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  const hours = Math.floor(wrapped / 60);
  const mins = wrapped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function formatFrenchClock(time: string): string {
  const match = /^(\d{2}):(\d{2})/.exec(time);
  if (!match) return time;
  return `${match[1]}h${match[2]}`;
}

const DAWN_MINUTES = 6 * 60;

export function clockMinutes(time: string): number {
  const match = /^(\d{2}):(\d{2})/.exec(time);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Wedding-day clock. A time before 06:00 belongs after midnight, so 02:00 sorts after 23:00. */
export function weddingDayMinutes(time: string): number {
  const mins = clockMinutes(time);
  return mins < DAWN_MINUTES ? mins + 24 * 60 : mins;
}

export function compareWeddingTimes(a: string, b: string): number {
  return weddingDayMinutes(a) - weddingDayMinutes(b);
}

export function parisClockMinutes(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return weddingDayMinutes(`${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`);
}

export type StepPhase = "past" | "current" | "upcoming" | "planned";

export function stepPhases(startsAt: readonly string[], nowMinutes: number, weddingDay: boolean): StepPhase[] {
  if (!weddingDay) return startsAt.map(() => "planned");
  const minutes = startsAt.map((time) => weddingDayMinutes(time));
  return minutes.map((start, index) => {
    const next = minutes[index + 1];
    if (nowMinutes < start) return "upcoming";
    if (next === undefined) return nowMinutes < start + 120 ? "current" : "past";
    if (nowMinutes < next) return "current";
    return "past";
  });
}

export function selectLiveStep<T extends { startsAt: string }>(slots: readonly T[], nowMinutes: number): T | null {
  const ordered = [...slots].sort((a, b) => compareWeddingTimes(a.startsAt, b.startsAt));
  if (ordered.length === 0) return null;
  return ordered.find((slot) => weddingDayMinutes(slot.startsAt) >= nowMinutes) ?? ordered[0];
}

export function programmeSpan(slots: readonly { startsAt: string }[]): { first: string; last: string; count: number; minutes: number } | null {
  if (slots.length === 0) return null;
  const ordered = [...slots].sort((a, b) => compareWeddingTimes(a.startsAt, b.startsAt));
  const first = ordered[0]?.startsAt ?? "";
  const last = ordered[ordered.length - 1]?.startsAt ?? first;
  return {
    first,
    last,
    count: ordered.length,
    minutes: Math.max(0, weddingDayMinutes(last) - weddingDayMinutes(first)),
  };
}

export type StepKind = "prep" | "ceremony" | "drink" | "photo" | "dinner" | "party" | "other";

export function stepKind(title: string): StepKind {
  const value = title.toLowerCase();
  if (value.includes("prépar") || value.includes("prepar")) return "prep";
  if (value.includes("cérémon") || value.includes("ceremon") || value.includes("mairie")) return "ceremony";
  if (value.includes("cocktail") || value.includes("vin d")) return "drink";
  if (value.includes("photo")) return "photo";
  if (value.includes("dîner") || value.includes("diner") || value.includes("déjeuner") || value.includes("repas")) return "dinner";
  if (value.includes("soirée") || value.includes("soiree") || value.includes("bal")) return "party";
  return "other";
}

export function minutesBetween(from: string, to: string): number {
  const start = /^(\d{2}):(\d{2})/.exec(from);
  const end = /^(\d{2}):(\d{2})/.exec(to);
  if (!start || !end) return 0;
  return Number(end[1]) * 60 + Number(end[2]) - (Number(start[1]) * 60 + Number(start[2]));
}

export function describeShift(author: string, title: string, deltaMinutes: number, newTime: string): string {
  const amount = Math.abs(deltaMinutes);
  const verb = deltaMinutes >= 0 ? "décalé" : "avancé";
  const unit = amount === 1 ? "minute" : "minutes";
  return `${author} a ${verb} ${title} de ${amount} ${unit}, c'est désormais à ${formatFrenchClock(newTime)}.`;
}
