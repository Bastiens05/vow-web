"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { messageFromError } from "@/lib/errors";
import { validateOffer, validateVendorProfile } from "@/lib/domain/validation";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/server/session";
import type { ActionState } from "@/server/actions/auth";

export async function saveVendorProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (session.profile.role !== "vendor") return { error: "Seuls les prestataires ont une vitrine." };

  const parsed = validateVendorProfile({
    businessName: String(formData.get("business_name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    category: String(formData.get("category") ?? ""),
    city: String(formData.get("city") ?? ""),
    zone: String(formData.get("zone") ?? ""),
    description: String(formData.get("description") ?? ""),
    contactEmail: String(formData.get("contact_email") ?? ""),
    contactPhone: String(formData.get("contact_phone") ?? ""),
    website: String(formData.get("website") ?? ""),
    startingPrice: String(formData.get("starting_price") ?? ""),
    published: formData.get("published") === "on",
  });
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const payload = {
    business_name: parsed.value.businessName,
    slug: parsed.value.slug,
    category: parsed.value.category,
    city: parsed.value.city,
    zone: parsed.value.zone,
    description: parsed.value.description,
    contact_email: parsed.value.contactEmail,
    contact_phone: parsed.value.contactPhone,
    website: parsed.value.website,
    starting_price_cents: parsed.value.startingPriceCents,
    published: parsed.value.published,
  };

  const { error } = session.vendor
    ? await supabase.from("vendor_profiles").update(payload).eq("id", session.vendor.id)
    : await supabase.from("vendor_profiles").insert({ ...payload, user_id: session.userId });

  if (error) return { error: messageFromError(error) };
  revalidatePath("/espace/profil");
  revalidatePath("/espace");
  revalidatePath(`/p/${parsed.value.slug}`);
  return { success: parsed.value.published ? "Vitrine publiée." : "Vitrine enregistrée." };
}

export async function addOffer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.vendor) return { error: "Enregistrez d'abord votre vitrine." };
  const parsed = validateOffer({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    price: String(formData.get("price") ?? ""),
  });
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("vendor_offers").insert({
    vendor_id: session.vendor.id,
    title: parsed.value.title,
    description: parsed.value.description,
    price_cents: parsed.value.priceCents,
  });
  if (error) return { error: messageFromError(error) };
  revalidatePath("/espace/profil");
  revalidatePath(`/p/${session.vendor.slug}`);
  return { success: "Offre ajoutée." };
}

export async function deleteOffer(formData: FormData) {
  const session = await requireSession();
  if (!session.vendor) redirect("/espace/profil");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("vendor_offers").delete().eq("id", id).eq("vendor_id", session.vendor.id);
  revalidatePath("/espace/profil");
  revalidatePath(`/p/${session.vendor.slug}`);
}

export async function deletePhoto(formData: FormData) {
  const session = await requireSession();
  if (!session.vendor) redirect("/espace/profil");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { data: photo } = await supabase
    .from("vendor_photos")
    .select("*")
    .eq("id", id)
    .eq("vendor_id", session.vendor.id)
    .maybeSingle();
  if (!photo) return;
  await supabase.storage.from("vendor-media").remove([photo.storage_path]);
  await supabase.from("vendor_photos").delete().eq("id", photo.id);
  revalidatePath("/espace/profil");
  revalidatePath(`/p/${session.vendor.slug}`);
}
