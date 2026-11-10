import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasPublicSupabaseEnv } from "@/lib/env";
import type { Tables } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type SessionProfile = {
  userId: string;
  email: string | null;
  profile: Tables<"profiles">;
  vendor: Tables<"vendor_profiles"> | null;
};

async function hintedUserId(): Promise<string | null | "anonymous"> {
  const headerStore = await headers();
  const value = headerStore.get("x-vow-user-id");
  if (value === null) return null;
  if (!/^[0-9a-f-]{36}$/i.test(value)) return "anonymous";
  return value;
}

export const getSession = cache(async (): Promise<SessionProfile | null> => {
  if (!hasPublicSupabaseEnv()) return null;
  const supabase = await createClient();
  const hinted = await hintedUserId();
  if (hinted === "anonymous") return null;
  let userId = hinted;
  let email: string | null = null;

  if (!userId) {
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims.sub) return null;
    userId = data.claims.sub;
    email = typeof data.claims.email === "string" ? data.claims.email : null;
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!profile) return null;

  let vendor: Tables<"vendor_profiles"> | null = null;
  if (profile.role === "vendor") {
    const { data: vendorProfile } = await supabase
      .from("vendor_profiles")
      .select("id, user_id, business_name, slug, category, city, published, description, zone, contact_email, contact_phone, website, starting_price_cents, currency, logo_path, stripe_account_id, created_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    vendor = vendorProfile;
  }

  return { userId, email: email ?? profile.email, profile, vendor };
});

export async function requireSession(): Promise<SessionProfile> {
  const session = await getSession();
  if (!session) redirect("/connexion");
  return session;
}
