import type { Metadata } from "next";
import { AuthFlow } from "@/components/auth/auth-flow";
import { Alert } from "@/components/ui/alert";
import { safeNextPath } from "@/lib/domain/paths";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; email?: string }>;
}) {
  const params = await searchParams;
  const notice =
    params.error === "lien" ? (
      <Alert>Le lien a expiré ou n&apos;est plus valide.</Alert>
    ) : params.error === "config" ? (
      <Alert>Supabase n&apos;est pas configuré sur ce serveur.</Alert>
    ) : null;
  return (
    <AuthFlow
      mode="login"
      nextPath={safeNextPath(params.next)}
      initialEmail={params.email ?? ""}
      notice={notice}
    />
  );
}
