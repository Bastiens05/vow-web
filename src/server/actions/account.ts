"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isVendorCategory } from "@/lib/domain/categories";
import { groupStoragePaths } from "@/lib/domain/account-files";
import { coupleIntentReady, readSignupIntent } from "@/lib/domain/signup-intent";
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

export async function createCoupleWedding(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (session.profile.role !== "couple") return { error: "Réservé aux mariés." };
  const intent = readSignupIntent(formData, "couple");
  if (!coupleIntentReady(intent)) return { error: "Indiquez le prénom, le nom et la date du mariage." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_couple_wedding", {
    p_partner_one: intent.partnerOne,
    p_partner_two: intent.partnerTwo,
    p_wedding_date: intent.weddingDate,
    p_city: intent.city,
    p_partner_one_last: intent.partnerOneLast,
    p_partner_two_last: intent.partnerTwoLast,
  });
  if (error || !data) return { error: error ? messageFromError(error) : "Le mariage n'a pas pu être créé." };
  revalidatePath("/espace");
  redirect(`/mariage/${data}`);
}

export async function deleteAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (String(formData.get("confirm") ?? "").trim() !== "SUPPRIMER") {
    return { error: "Écrivez SUPPRIMER pour confirmer." };
  }
  const session = await requireSession();
  const supabase = await createClient();
  const listed = await supabase.rpc("my_account_files");
  if (listed.error) {
    const message = listed.error.message.toLowerCase();
    if (message.includes("could not find") || message.includes("my_account_files")) {
      return { error: "La suppression de compte n'est pas encore ouverte." };
    }
    return { error: messageFromError(listed.error) };
  }
  const ownFolders = await listOwnStorageFolders(supabase, session.userId);
  const removed = await removeAccountFiles(supabase, [...(listed.data ?? []), ...ownFolders]);
  if (removed) return { error: removed };
  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("storage")) {
      return { error: "La suppression des fichiers n'est pas passée par l'API Storage. Le compte est resté en place." };
    }
    return { error: messageFromError(error) };
  }
  await supabase.auth.signOut();
  redirect("/");
}

async function listOwnStorageFolders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ bucket: string; path: string }[]> {
  const { data: memberships } = await supabase.from("wedding_members").select("wedding_id").eq("user_id", userId);
  const prefixes: { bucket: string; prefix: string }[] = [
    { bucket: "vendor-media", prefix: userId },
    { bucket: "wedding-documents", prefix: `coffre/${userId}` },
  ];
  for (const membership of memberships ?? []) {
    prefixes.push({ bucket: "wedding-documents", prefix: `${membership.wedding_id}/${userId}` });
    prefixes.push({ bucket: "wedding-gallery", prefix: `${membership.wedding_id}/${userId}` });
  }
  const files: { bucket: string; path: string }[] = [];
  for (const item of prefixes) {
    const { data, error } = await supabase.storage.from(item.bucket).list(item.prefix, { limit: 1000 });
    if (error || !data) continue;
    for (const entry of data) {
      if (!entry.id || !entry.name) continue;
      files.push({ bucket: item.bucket, path: `${item.prefix}/${entry.name}` });
    }
  }
  return files;
}

async function removeAccountFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  files: { bucket: string; path: string }[],
): Promise<string | null> {
  const grouped = groupStoragePaths(files);
  for (const [bucket, paths] of grouped) {
    for (let index = 0; index < paths.length; index += 100) {
      const chunk = paths.slice(index, index + 100);
      const { error } = await supabase.storage.from(bucket).remove(chunk);
      if (!error) continue;
      const message = error.message.toLowerCase();
      if (message.includes("row-level") || message.includes("policy") || message.includes("unauthorized") || message.includes("not allowed")) {
        return "Certains fichiers restent hors de portée de votre session (droits du stockage). Le compte n'a pas été supprimé. Vos propres fichiers (vitrine, coffre, documents dont le dossier est le vôtre) partent avec cette session. Un fichier déposé par quelqu'un d'autre, ou une galerie que vous ne gérez pas, demande une suppression côté serveur avec la clé service_role. Elle n'est pas branchée ici.";
      }
      return "Les fichiers n'ont pas pu être retirés. Le compte n'a pas été supprimé.";
    }
  }
  return null;
}
