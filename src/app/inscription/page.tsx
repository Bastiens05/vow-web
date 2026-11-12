import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFlow } from "@/components/auth/auth-flow";
import { isVendorCategory } from "@/lib/domain/categories";
import { isVendorPlan } from "@/lib/domain/plans";
import { safeNextPath } from "@/lib/domain/paths";
import { hasPublicSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inscription" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string; role?: string; plan?: string; invite?: string }>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next, "");
  const invite = await readInvite(params.invite);
  const lockedRole = params.role === "vendor" || params.role === "couple" ? params.role : invite ? "vendor" : undefined;
  if (params.role === "login") redirect(`/connexion?next=${encodeURIComponent(nextPath || "/espace")}`);
  const fullName = [invite?.first_name, invite?.last_name].filter(Boolean).join(" ").trim();
  const category = invite?.trade && isVendorCategory(invite.trade) ? invite.trade : undefined;
  return (
    <AuthFlow
      mode="signup"
      nextPath={nextPath}
      initialEmail={invite?.email ?? params.email ?? ""}
      lockedRole={lockedRole}
      inviteToken={params.invite}
      initialCategory={category}
      initialFullName={fullName || undefined}
      initialPlan={params.plan && isVendorPlan(params.plan) ? params.plan : invite?.plan && isVendorPlan(invite.plan) ? invite.plan : undefined}
    />
  );
}

async function readInvite(token: string | undefined) {
  if (!token || !hasPublicSupabaseEnv()) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("lookup_tester_invite", { p_token: token });
  return data?.[0] ?? null;
}
