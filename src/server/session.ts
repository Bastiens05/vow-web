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

export async function getSession(): Promise<SessionProfile | null> {
  if (!hasPublicSupabaseEnv()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return null;

  const userId = data.claims.sub;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!profile) return null;

  let vendor: Tables<"vendor_profiles"> | null = null;
  if (profile.role === "vendor") {
    const { data: vendorProfile } = await supabase
      .from("vendor_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    vendor = vendorProfile;
  }

  return { userId, email, profile, vendor };
}

export async function requireSession(): Promise<SessionProfile> {
  const session = await getSession();
  if (!session) redirect("/connexion");
  return session;
}
