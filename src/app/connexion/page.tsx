import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm, MagicLinkForm } from "@/components/auth/auth-forms";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/page-header";
import { safeNextPath } from "@/lib/domain/paths";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  return (
    <Container narrow>
      <Card>
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold-deep">Espace membre</p>
        <h1 className="mt-2 font-semibold tracking-tight text-4xl">Connexion</h1>
        <p className="mt-2 text-sm leading-6 text-muted">E-mail et mot de passe, ou un lien magique si le compte existe déjà.</p>
        {params.error === "lien" ? (
          <div className="mt-4">
            <Alert>Le lien a expiré ou n&apos;est plus valide.</Alert>
          </div>
        ) : null}
        {params.error === "config" ? (
          <div className="mt-4">
            <Alert>Supabase n&apos;est pas configuré sur ce serveur.</Alert>
          </div>
        ) : null}
        <div className="mt-6">
          <LoginForm nextPath={nextPath} />
        </div>
        <div className="my-6 h-px bg-line" />
        <MagicLinkForm nextPath={nextPath} />
        <p className="mt-6 text-sm text-muted">
          Pas encore de compte ?{" "}
          <Link href={`/inscription?next=${encodeURIComponent(nextPath)}`} className="text-ink underline">
            Créer un compte
          </Link>
        </p>
      </Card>
    </Container>
  );
}
