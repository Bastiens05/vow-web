import { categoryLabel, isVendorCategory } from "@/lib/domain/categories";

export function documentAuthorLabel(input: {
  uploadedBy: string;
  viewerId: string;
  role: string | null;
  category: string | null;
}): string {
  if (input.uploadedBy && input.uploadedBy === input.viewerId) return "Vous";
  if (input.role === "couple") return "Couple";
  if (input.category && isVendorCategory(input.category)) return categoryLabel(input.category);
  if (input.role === "vendor") return "Prestataire";
  return "Membre";
}
