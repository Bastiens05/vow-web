import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth/auth-forms";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/page-header";
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
  return (
    <Container narrow>
      <Card>
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold-deep">Nouveau compte</p>
        <h1 className="mt-2 font-serif text-4xl">Inscription</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Un compte prestataire ou un compte couple. Le rôle est choisi ici, il n&apos;y a pas de code d&apos;accès.
        </p>
        <div className="mt-6">
          <SignupForm nextPath={nextPath} defaultEmail={params.email ?? ""} lockedRole={lockedRole} />
        </div>
        <p className="mt-6 text-sm text-muted">
          Déjà inscrit ?{" "}
          <Link href={`/connexion?next=${encodeURIComponent(nextPath || "/espace")}`} className="text-ink underline">
            Se connecter
          </Link>
        </p>
      </Card>
    </Container>
  );
}
