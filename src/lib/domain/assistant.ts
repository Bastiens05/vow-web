import type { TemplateSlot } from "@/lib/domain/timeline-templates";

export const ASSISTANT_MODEL = "google/gemini-2.5-flash-lite";
export const ASSISTANT_DAILY_LIMIT = 30;
export const ASSISTANT_UNAVAILABLE = "Assistant indisponible pour le moment.";
export const ASSISTANT_LIMIT = "Vous avez atteint les 30 messages du jour. On reprend demain.";

export function assistantEnabled(): boolean {
  return process.env.AI_ASSISTANT_ENABLED === "true";
}

export function assistantFailureMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error ?? "");
  if (text.includes("30 messages")) return ASSISTANT_LIMIT;
  return ASSISTANT_UNAVAILABLE;
}

const BUDGET_SPLIT: readonly { label: string; percent: number }[] = [
  { label: "Lieu et traiteur", percent: 45 },
  { label: "Photo", percent: 10 },
  { label: "Vidéo", percent: 7 },
  { label: "DJ et musique", percent: 6 },
  { label: "Tenues", percent: 8 },
  { label: "Fleurs et décoration", percent: 8 },
  { label: "Alliances", percent: 5 },
  { label: "Divers", percent: 11 },
];

export type BudgetLineSuggestion = { label: string; percent: number; cents: number };

export function splitBudget(totalCents: number): BudgetLineSuggestion[] {
  const total = Math.max(0, Math.round(totalCents));
  let used = 0;
  return BUDGET_SPLIT.map((line, index) => {
    const cents = index === BUDGET_SPLIT.length - 1 ? total - used : Math.round((total * line.percent) / 100);
    used += cents;
    return { label: line.label, percent: line.percent, cents };
  });
}

export function parseProgrammeSlots(value: unknown): TemplateSlot[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > 12) return null;
  const slots: TemplateSlot[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const rawTime = typeof row.startsAt === "string" ? row.startsAt.trim() : "";
    const startsAt = rawTime.slice(0, 5);
    const place = typeof row.place === "string" ? row.place.trim().slice(0, 120) : "";
    const notes = typeof row.notes === "string" ? row.notes.trim().slice(0, 240) : "";
    if (title.length < 2 || title.length > 80) return null;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startsAt)) return null;
    slots.push({ title, startsAt, place, notes });
  }
  return slots;
}

export type RemainingItem = { id: string; label: string; href: string };

export function coupleRemaining(input: {
  weddingId: string;
  hasPractical: boolean;
  needsPhotos: boolean;
  hasPhotos: boolean;
  needsGuests: boolean;
  hasGuests: boolean;
  hasTimeline: boolean;
  pendingSignature: boolean;
  hasDocument: boolean;
  hasVault: boolean;
}): RemainingItem[] {
  const base = `/mariage/${input.weddingId}`;
  const items: RemainingItem[] = [];
  if (input.pendingSignature) items.push({ id: "signature", label: "Signer le contrat", href: `${base}/documents` });
  if (!input.hasPractical) items.push({ id: "practical", label: "Renseigner les infos pratiques", href: `${base}/pratique` });
  if (input.needsPhotos && !input.hasPhotos) items.push({ id: "photos", label: "Lister les photos de groupe", href: `${base}/pratique` });
  if (input.needsGuests && !input.hasGuests) items.push({ id: "guests", label: "Noter les invités et les régimes", href: `${base}/pratique` });
  if (!input.hasTimeline) items.push({ id: "timeline", label: "Poser le programme du jour", href: `${base}/jour` });
  if (!input.hasVault) items.push({ id: "vault", label: "Déposer une pièce dans le coffre", href: `${base}/coffre` });
  if (!input.hasDocument && !input.pendingSignature) items.push({ id: "document", label: "Déposer un document", href: `${base}/documents` });
  return items;
}

export function assistantToolNames(role: "couple" | "vendor"): readonly string[] {
  return role === "couple"
    ? ["whatsLeft", "proposeProgramme", "draftVendorMessage", "suggestBudget"]
    : ["summarizeWedding", "draftReply", "suggestChecklist"];
}

export function clipText(value: string, max: number): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
