export function hasPublicSupabaseEnv(): boolean {
  return Boolean(publicSupabaseUrl() && publicSupabaseKey());
}

export function publicSupabaseUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url && url.length > 0 ? url.replace(/\/$/, "") : undefined;
}

export function publicSupabaseKey(): string | undefined {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return key && key.length > 0 ? key : undefined;
}

export function getPublicSupabaseEnv(): { url: string; key: string } {
  const url = publicSupabaseUrl();
  const key = publicSupabaseKey();
  if (!url || !key) {
    throw new Error(
      "Variables Supabase publiques manquantes (NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
    );
  }
  return { url, key };
}

export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
  return configured.replace(/\/$/, "");
}
