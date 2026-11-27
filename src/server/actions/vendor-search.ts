"use server";

import { revalidatePath } from "next/cache";
import { isVendorCategory, categoryLabel } from "@/lib/domain/categories";
import { vendorSearchQuery } from "@/lib/domain/vendor-search";
import { generateInvitationToken } from "@/lib/domain/token";
import { messageFromError } from "@/lib/errors";
import { siteUrl } from "@/lib/env";
import { publicObjectUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { magicInvitationUrl, sendInvitationEmail } from "@/server/product-mail";
import { requireSession } from "@/server/session";

export type VendorSearchResult = {
  userId: string;
  businessName: string;
  personName: string;
  category: string;
  trade: string;
  city: string;
  logoUrl: string | null;
};

export async function searchDiscoverableVendors(
  query: string,
  category: string,
): Promise<{ vendors: VendorSearchResult[]; unavailable: boolean }> {
  await requireSession();
  const trade = category && isVendorCategory(category) ? category : "";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_discoverable_vendors", {
    p_query: vendorSearchQuery(query),
    p_category: trade,
  });
  if (error || !data) return { vendors: [], unavailable: Boolean(error) };
  return {
    unavailable: false,
    vendors: data.map((row) => ({
      userId: row.user_id,
      businessName: row.business_name,
      personName: row.person_name,
      category: row.category,
      trade: isVendorCategory(row.category) ? categoryLabel(row.category) : "Prestataire",
      city: row.city,
      logoUrl: row.logo_path ? publicObjectUrl("vendor-media", row.logo_path) : null,
    })),
  };
}

export async function inviteDiscoveredVendor(weddingId: string, vendorUserId: string): Promise<ActionState> {
  await requireSession();
  if (!/^[0-9a-f-]{36}$/i.test(weddingId) || !/^[0-9a-f-]{36}$/i.test(vendorUserId)) {
    return { error: "Invitation impossible." };
  }
  const supabase = await createClient();
  const token = generateInvitationToken();
  const { data, error } = await supabase.rpc("invite_discovered_vendor", {
    p_wedding: weddingId,
    p_vendor: vendorUserId,
    p_token: token,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    const message = messageFromError(error);
    if (/search_discoverable|invite_discovered|schema cache|does not exist|column/i.test(message)) {
      return { error: "La recherche n'est pas encore ouverte." };
    }
    return { error: message || "L'invitation n'a pas abouti." };
  }
  const email = typeof data.email === "string" ? data.email : "";
  if (!email) return { error: "L'invitation n'a pas abouti." };
  const { data: wedding } = await supabase
    .from("weddings")
    .select("partner_one_name, partner_two_name")
    .eq("id", weddingId)
    .maybeSingle();
  const title = wedding ? `${wedding.partner_one_name} & ${wedding.partner_two_name}` : "Votre mariage";
  const fallback = `${siteUrl()}/invitation/${token}`;
  const url = await magicInvitationUrl({ email, role: "vendor", token, fallback });
  await sendInvitationEmail({ to: email, title, url, role: "vendor" });
  revalidatePath(`/mariage/${weddingId}/equipe`);
  revalidatePath("/nouveautes");
  return { success: "Invitation envoyée. Le prestataire peut accepter ou refuser." };
}

export async function saveDiscoverable(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.vendor || session.vendor.user_id !== session.userId) return { error: "Réservé au prestataire." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("vendor_profiles")
    .update({ discoverable: formData.get("discoverable") === "on" })
    .eq("id", session.vendor.id);
  if (error) {
    const message = messageFromError(error);
    if (/discoverable|schema cache|column|does not exist/i.test(message)) {
      return { error: "Ce réglage s'ouvrira après la mise à jour de la base." };
    }
    return { error: message };
  }
  revalidatePath("/reglages");
  return { success: "Enregistré." };
}
