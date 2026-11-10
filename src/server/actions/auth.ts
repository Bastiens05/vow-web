"use server";

import { redirect } from "next/navigation";
import { messageFromError } from "@/lib/errors";
import { siteUrl } from "@/lib/env";
import { safeNextPath } from "@/lib/domain/paths";
import { normalizeEmail } from "@/lib/domain/validation";
import { createClient } from "@/lib/supabase/server";

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
  redirect(next);
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = readRole(formData.get("role"));
  const requested = safeNextPath(formData.get("next"), "");

  if (fullName.length < 2) return { error: "Indiquez votre nom." };
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Indiquez un e-mail valide." };
  }
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  if (!role) return { error: "Choisissez un type de compte : prestataire ou couple." };

  const destination = requested.startsWith("/invitation/")
    ? requested
    : role === "vendor"
      ? "/espace/profil"
      : "/espace";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(destination)}`,
      data: { role, full_name: fullName },
    },
  });
  if (error) return { error: messageFromError(error) };
  if (!data.session) {
    return {
      success: "Compte créé. Ouvrez le lien reçu par e-mail pour activer la connexion, puis revenez ici.",
    };
  }
  redirect(destination);
}

export async function sendMagicLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const next = safeNextPath(formData.get("next"));
  if (!email) return { error: "Indiquez votre e-mail." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      shouldCreateUser: false,
    },
  });
  if (error) return { error: messageFromError(error) };
  return { success: "Si un compte existe pour cette adresse, un lien de connexion vient d'être envoyé." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
