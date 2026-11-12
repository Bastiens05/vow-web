"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isVendorCategory } from "@/lib/domain/categories";
import { isValidEmail } from "@/lib/domain/auth-routing";
import { safeNextPath } from "@/lib/domain/paths";
import { coupleIntentReady, intentMetadata, readSignupIntent, vendorIntentReady } from "@/lib/domain/signup-intent";
import { slugify } from "@/lib/domain/slug";
import { normalizeEmail } from "@/lib/domain/validation";
import { otpCodeEnabled } from "@/lib/auth-providers";
import { siteUrl } from "@/lib/env";
import { messageFromError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { landingPath } from "@/server/auth-landing";
import { materializeSignup } from "@/server/signup-materialize";
import { requireSession } from "@/server/session";

export type ActionState = {
  error?: string;
  success?: string;
};

function readRole(value: FormDataEntryValue | null): "vendor" | "couple" | null {
  if (value === "vendor" || value === "couple") return value;
  return null;
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));
  if (!email || password.length < 8) {
    return { error: "Indiquez votre e-mail et un mot de passe d'au moins 8 caractères." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: messageFromError(error) };
  redirect(await landingPath(supabase, next));
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const role = readRole(formData.get("role"));
  const intent = readSignupIntent(formData, role);
  const fullName = intent.fullName || intent.businessName || intent.partnerOne;
  const requested = safeNextPath(formData.get("next"), "");

  if (fullName.length < 2) return { error: "Indiquez votre nom." };
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Indiquez un e-mail valide." };
  }
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  if (!role) return { error: "Choisissez un type de compte : prestataire ou couple." };
  if (role === "vendor" && (intent.businessName || intent.category) && !vendorIntentReady(intent)) {
    return { error: "Indiquez le métier, le nom de l'activité et la ville." };
  }
  if (role === "couple" && (intent.partnerOne || intent.partnerTwo || intent.weddingDate) && !coupleIntentReady(intent)) {
    return { error: "Indiquez le prénom, le nom et la date du mariage." };
  }

  const destination = requested.startsWith("/invitation/") || requested.startsWith("/equipe/") ? requested : "/espace";

  const supabase = await createClient();
  await rememberAuthNext(destination);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback`,
      data: { ...intentMetadata({ ...intent, fullName, role }), role, full_name: fullName },
    },
  });
  if (error) return { error: messageFromError(error) };
  if (!data.session || !data.user) {
    return { success: "Vérifiez votre boîte mail. Le lien confirme votre compte." };
  }
  if (!destination.startsWith("/invitation/") && !destination.startsWith("/equipe/")) {
    await materializeSignup(supabase, data.user.id, { ...intent, fullName, role });
  } else {
    redirect(destination);
  }
  redirect(await landingPath(supabase, destination, true));
}

export async function sendMagicLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const next = safeNextPath(formData.get("next"));
  if (!email) return { error: "Indiquez votre e-mail." };

  const supabase = await createClient();
  await rememberAuthNext(next);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback`,
      shouldCreateUser: false,
    },
  });
  if (error) return { error: messageFromError(error) };
  return { success: "Si un compte existe pour cette adresse, un lien de connexion vient d'être envoyé." };
}

export async function requestEmailCode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const next = safeNextPath(formData.get("next"), "/espace");
  const role = readRole(formData.get("role"));
  const intent = readSignupIntent(formData, role);
  const create = formData.get("create") === "1";
  if (!isValidEmail(email)) return { error: "Indiquez un e-mail valide." };
  if (create && role === "vendor" && (intent.businessName || intent.category) && !vendorIntentReady(intent)) {
    return { error: "Indiquez le métier, le nom de l'activité et la ville." };
  }
  if (create && role === "couple" && (intent.partnerOne || intent.partnerTwo || intent.weddingDate) && !coupleIntentReady(intent)) {
    return { error: "Indiquez le prénom, le nom et la date du mariage." };
  }

  const supabase = await createClient();
  await rememberAuthNext(next);
  const metadata = intentMetadata(intent);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: create,
      emailRedirectTo: `${siteUrl()}/auth/callback`,
      data: Object.keys(metadata).length ? metadata : undefined,
    },
  });
  if (error) return { error: otpError(error.message, otpCodeEnabled()) };
  return { success: otpCodeEnabled() ? `code:${Date.now()}` : `link:${Date.now()}` };
}

export async function verifyEmailCode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const token = String(formData.get("token") ?? "").replace(/\D/g, "");
  const next = safeNextPath(formData.get("next"), "/espace");
  if (!isValidEmail(email)) return { error: "Indiquez un e-mail valide." };
  if (!/^\d{6}$/.test(token)) return { error: "Le code comporte 6 chiffres." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { error: "Code incorrect ou expiré. Demandez-en un nouveau." };
  redirect(await landingPath(supabase, next, true));
}

export async function startOAuth(provider: "google" | "apple", nextPath: string) {
  const supabase = await createClient();
  const next = safeNextPath(nextPath, "/espace");
  await rememberAuthNext(next);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${siteUrl()}/auth/callback` },
  });
  if (error || !data.url) return;
  redirect(data.url);
}

export async function completeVendor(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (session.profile.role !== "vendor") redirect("/espace");
  const businessName = String(formData.get("business_name") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const city = String(formData.get("city") ?? "").trim();
  if (businessName.length < 2 || businessName.length > 120) return { error: "Indiquez le nom de votre activité." };
  if (!isVendorCategory(category)) return { error: "Choisissez votre métier." };
  if (city.length < 2 || city.length > 120) return { error: "Indiquez votre ville." };

  const supabase = await createClient();
  if (!session.profile.full_name) {
    await supabase.from("profiles").update({ full_name: businessName }).eq("id", session.userId);
  }
  if (!session.vendor) {
    const slug = `${slugify(businessName)}-${session.userId.slice(0, 4)}`;
    const { error } = await supabase.from("vendor_profiles").insert({
      user_id: session.userId,
      business_name: businessName,
      slug,
      category,
      city,
    });
    if (error) return { error: messageFromError(error) };
  } else {
    const { error } = await supabase.from("vendor_profiles").update({ business_name: businessName, category, city }).eq("id", session.vendor.id);
    if (error) return { error: messageFromError(error) };
  }
  redirect("/bienvenue?etape=logo");
}

async function rememberAuthNext(next: string) {
  const jar = await cookies();
  jar.set("vow-auth-next", next, { path: "/", maxAge: 60 * 30, sameSite: "lax", httpOnly: true });
}

function otpError(message: string, code: boolean): string {
  const lower = message.toLowerCase();
  if (lower.includes("rate") || lower.includes("once every")) {
    return code ? "Patientez un instant avant de redemander un code." : "Patientez un instant avant de renvoyer le lien.";
  }
  if (lower.includes("signups not allowed") || lower.includes("user not found") || lower.includes("signups")) {
    return "Aucun compte pour cette adresse. Créez-le d'abord.";
  }
  return code ? "L'envoi du code a échoué. Réessayez." : "L'envoi du lien a échoué. Réessayez.";
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
