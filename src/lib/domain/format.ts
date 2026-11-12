import { compareWeddingTimes } from "@/lib/domain/day";

export function formatLongDate(isoDate: string | null): string {
  if (!isoDate) return "Date à confirmer";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatSlotTime(value: string): string {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  return `${match[1]}:${match[2]}`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function weddingTitle(partnerOne: string, partnerTwo: string): string {
  return `${partnerOne} & ${partnerTwo}`;
}

export function joinPersonName(first: string, last: string | null | undefined): string {
  return [first.trim(), (last ?? "").trim()].filter(Boolean).join(" ");
}

export function coupleFullNames(
  oneFirst: string,
  oneLast: string | null | undefined,
  twoFirst: string,
  twoLast: string | null | undefined,
): string {
  const one = joinPersonName(oneFirst, oneLast);
  const two = joinPersonName(twoFirst, twoLast);
  const hasLast = Boolean((oneLast ?? "").trim() || (twoLast ?? "").trim());
  if (!hasLast) return "";
  if (!one) return two;
  if (!two || two === "À venir" || two === "Couple") return one;
  return `${one} & ${two}`;
}

export function coupleHeroTitle(partnerOne: string, partnerTwo: string): string {
  const one = partnerOne.trim();
  const two = partnerTwo.trim();
  if (!one) return "Votre mariage";
  if (!two || two === "À venir" || two === "Couple") return `Mariage de ${one}`;
  return `Mariage de ${one} et ${two}`;
}

export type TimelineSlotLike = {
  startsAt: string;
  sortOrder: number;
  createdAt?: string;
};

export function sortTimelineSlots<T extends TimelineSlotLike>(slots: readonly T[]): T[] {
  return [...slots].sort((a, b) => {
    const byTime = compareWeddingTimes(a.startsAt, b.startsAt);
    if (byTime !== 0) return byTime;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
  });
}

export function todayIso(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
