import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { landingFor } from "@/lib/domain/auth-routing";

export async function landingPath(
  supabase: SupabaseClient<Database>,
  nextPath: string,
  onboard = false,
): Promise<string> {
  if (nextPath.startsWith("/invitation/")) {
    const token = nextPath.split("/")[2] ?? "";
    const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
    if (!error && data) return `/mariage/${data}`;
    return nextPath;
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return nextPath || "/espace";

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!profile) return "/espace";

  const [{ data: vendor }, { data: memberships }] = await Promise.all([
    supabase.from("vendor_profiles").select("id").eq("user_id", userId).maybeSingle(),
    supabase.from("wedding_members").select("wedding_id, member_role").eq("user_id", userId),
  ]);

  const coupleIds = (memberships ?? [])
    .filter((row) => row.member_role === "couple")
    .map((row) => row.wedding_id);
  const anyWedding = (memberships ?? [])[0]?.wedding_id ?? null;
  const weddingId = profile.role === "couple" ? (coupleIds[0] ?? anyWedding) : (coupleIds[0] ?? null);

  return landingFor({
    role: profile.role,
    hasVendorProfile: Boolean(vendor),
    weddingId,
    hasCoupleMembership: coupleIds.length > 0,
    lastSpace: null,
    nextPath,
    onboard,
  });
}
