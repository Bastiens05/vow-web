import { cache } from "react";
import { VENDOR_CATEGORIES, type VendorCategory } from "@/lib/domain/categories";
import { createClient } from "@/lib/supabase/server";

/** Trades added by the vendor_trades migration. Hidden until that enum value exists. */
const PENDING_TRADES: readonly VendorCategory[] = [
  "cake",
  "wine",
  "animation",
  "decor",
  "hair",
  "makeup",
  "attire",
  "stationery",
  "transport",
];

export const openVendorCategories = cache(async (): Promise<VendorCategory[]> => {
  const stable = VENDOR_CATEGORIES.filter((category) => !PENDING_TRADES.includes(category));
  const supabase = await createClient();
  const opened = await Promise.all(
    PENDING_TRADES.map(async (category) => {
      const { error } = await supabase.from("vendor_profiles").select("id").eq("category", category).limit(1);
      if (error) return null;
      return category;
    }),
  );
  const present = new Set<VendorCategory>([...stable, ...opened.filter((category): category is VendorCategory => category !== null)]);
  return VENDOR_CATEGORIES.filter((category) => present.has(category));
});

export async function categoryIsOpen(category: string): Promise<boolean> {
  if (category === "beauty") return true;
  const open = await openVendorCategories();
  return open.includes(category as VendorCategory);
}
