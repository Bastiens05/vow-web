"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isVendorCategory } from "@/lib/domain/categories";
import { slugify } from "@/lib/domain/slug";
import { messageFromError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { requireSession } from "@/server/session";

export async function saveAccountName(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (fullName.length < 2 || fullName.length > 120) {
    return { error: "Indiquez votre nom (2 à 120 caractères)." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", session.userId);
  if (error) return { error: messageFromError(error) };
  revalidatePath("/reglages");
  revalidatePath("/espace");
  return { success: "Nom enregistré." };
}

export async function saveNotificationPrefs(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      notify_in_app: formData.get("notify_in_app") === "on",
      notify_push: formData.get("notify_push") === "on",
      notify_email: formData.get("notify_email") === "on",
      notify_reminders: formData.get("notify_reminders") === "on",
    })
    .eq("id", session.userId);
  if (error) return { error: messageFromError(error) };
  revalidatePath("/reglages");
  return { success: "Préférences enregistrées." };
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  if (password !== confirm) return { error: "Les deux mots de passe ne correspondent pas." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: messageFromError(error) };
  return { success: "Mot de passe mis à jour." };
}

export async function saveBusinessBasics(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (session.profile.role !== "vendor") return { error: "Réservé aux prestataires." };
  const businessName = String(formData.get("business_name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const phone = String(formData.get("contact_phone") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  if (businessName.length < 2 || businessName.length > 120) return { error: "Indiquez le nom commercial." };
  if (city.length > 120) return { error: "La ville est trop longue." };
  if (phone.length > 40) return { error: "Le téléphone est trop long." };
  if (!isVendorCategory(category)) return { error: "Choisissez un métier." };

  const supabase = await createClient();
  if (session.vendor) {
    const { error } = await supabase
      .from("vendor_profiles")
      .update({ business_name: businessName, city, contact_phone: phone, category })
      .eq("id", session.vendor.id);
    if (error) return { error: messageFromError(error) };
  } else {
    const { error } = await supabase.from("vendor_profiles").insert({
      user_id: session.userId,
      business_name: businessName,
      slug: slugify(businessName),
      category,
      city,
      contact_phone: phone,
    });
    if (error) return { error: messageFromError(error) };
  }
  revalidatePath("/reglages");
  revalidatePath("/espace");
  return { success: "Informations enregistrées." };
}

export async function saveLogo(path: string): Promise<ActionState> {
  const session = await requireSession();
  if (!session.vendor) return { error: "Enregistrez d'abord le nom commercial." };
  if (!path.startsWith(`${session.userId}/`) || path.length > 300) return { error: "Logo invalide." };
  const supabase = await createClient();
  const previous = session.vendor.logo_path;
  const { error } = await supabase.from("vendor_profiles").update({ logo_path: path }).eq("id", session.vendor.id);
  if (error) return { error: messageFromError(error) };
  if (previous && previous !== path) {
    await supabase.storage.from("vendor-media").remove([previous]);
  }
  revalidatePath("/reglages");
  revalidatePath(`/p/${session.vendor.slug}`);
  return { success: "Logo enregistré." };
}

export async function openCoupleDemo() {
  const session = await requireSession();
  if (session.profile.role !== "vendor") redirect("/espace");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_couple_demo");
  if (error || !data) redirect("/espace");
  redirect(`/mariage/${data}`);
}

export async function leaveCouplePreview(formData: FormData) {
  await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const supabase = await createClient();
  await supabase.rpc("leave_couple_preview", { p_wedding_id: weddingId });
  revalidatePath(`/mariage/${weddingId}`);
  redirect(weddingId ? `/mariage/${weddingId}` : "/espace");
}

export async function deleteCoupleDemo() {
  await requireSession();
  const supabase = await createClient();
  await supabase.rpc("delete_couple_demo");
  redirect("/mariages");
}
