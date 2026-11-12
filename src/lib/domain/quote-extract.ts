import { isVendorCategory, type VendorCategory } from "./categories";

export type QuoteDraft = {
  businessName: string;
  category: VendorCategory;
  email: string;
  phone: string;
  amountCents: number | null;
};

export function emptyQuoteDraft(): QuoteDraft {
  return { businessName: "", category: "other", email: "", phone: "", amountCents: null };
}

export function parseQuoteDraft(value: unknown): QuoteDraft {
  const empty = emptyQuoteDraft();
  if (!value || typeof value !== "object") return empty;
  const row = value as Record<string, unknown>;
  const category = typeof row.category === "string" && isVendorCategory(row.category) ? row.category : "other";
  const amount = typeof row.amount_cents === "number" ? row.amount_cents : Number(row.amount_cents);
  return {
    businessName: typeof row.business_name === "string" ? row.business_name.trim().slice(0, 80) : "",
    category,
    email: typeof row.email === "string" ? row.email.trim().toLowerCase().slice(0, 160) : "",
    phone: typeof row.phone === "string" ? row.phone.trim().slice(0, 40) : "",
    amountCents: Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : null,
  };
}

export function draftFromModelText(text: string): QuoteDraft {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return emptyQuoteDraft();
  try {
    return parseQuoteDraft(JSON.parse(text.slice(start, end + 1)));
  } catch {
    return emptyQuoteDraft();
  }
}
