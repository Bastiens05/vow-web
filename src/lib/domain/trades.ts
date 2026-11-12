import type { VendorCategory } from "./categories";

export type Sheet = "practical" | "photos" | "guests" | "music";

const PHOTO_TRADES: readonly VendorCategory[] = ["photographer", "videographer"];
const GUEST_TRADES: readonly VendorCategory[] = ["caterer", "venue"];

export function sheetsFor(role: "vendor" | "couple", category: VendorCategory | null): Sheet[] {
  if (role === "couple" || category === "planner") return ["practical", "photos", "guests", "music"];
  const sheets: Sheet[] = ["practical"];
  if (category && PHOTO_TRADES.includes(category)) sheets.push("photos");
  if (category && GUEST_TRADES.includes(category)) sheets.push("guests");
  if (category === "dj") sheets.push("music");
  return sheets;
}

export function canSeeSheet(role: "vendor" | "couple", category: VendorCategory | null, sheet: Sheet): boolean {
  return sheetsFor(role, category).includes(sheet);
}

export function canDeliver(role: "vendor" | "couple", category: VendorCategory | null): boolean {
  if (role === "couple") return true;
  return category === "photographer" || category === "videographer";
}

export function pratiqueLabel(role: "vendor" | "couple", category: VendorCategory | null): string | null {
  const sheets = sheetsFor(role, category);
  const extra = sheets.filter((sheet) => sheet !== "practical");
  if (role === "vendor" && extra.length === 0) return "Infos";
  if (extra.length === 1 && extra[0] === "photos") return "Groupes";
  if (extra.length === 1 && extra[0] === "guests") return "Invités";
  if (extra.length === 1 && extra[0] === "music") return "Musique";
  if (extra.length === 0) return null;
  return "Pratique";
}
