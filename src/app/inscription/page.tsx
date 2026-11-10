import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFlow } from "@/components/auth/auth-flow";
import { configuredAuthProviders } from "@/lib/auth-providers";
import { safeNextPath } from "@/lib/domain/paths";

export const metadata: Metadata = { title: "Inscription" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string; role?: string }>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next, "");
  const lockedRole = params.role === "vendor" || params.role === "couple" ? params.role : undefined;
  const providers = configuredAuthProviders();
  if (params.role === "login") redirect(`/connexion?next=${encodeURIComponent(nextPath || "/espace")}`);
  return (
    <AuthFlow
      mode="signup"
      nextPath={nextPath}
      initialEmail={params.email ?? ""}
      lockedRole={lockedRole}
      google={providers.google}
      apple={providers.apple}
    />
  );
}
