import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/page-header";
import { formatLongDate, weddingTitle } from "@/lib/domain/format";
import { invitationPath } from "@/lib/domain/paths";
import { acceptInvitation } from "@/server/actions/weddings";
import { previewInvitation } from "@/server/data";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Invitation" };

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const preview = await previewInvitation(token);
  const session = await getSession();
  const next = invitationPath(token);

  return (
    <Container narrow>
      <Card>
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold-deep">Invitation</p>
        {preview.status === "missing" ? (
          <>
            <h1 className="mt-2 font-semibold tracking-tight text-4xl">Invitation introuvable</h1>
            <p className="mt-3 text-sm text-muted">Ce lien n&apos;existe pas ou n&apos;est plus valide.</p>
          </>
        ) : null}
        {preview.status === "expired" ? (
          <>
            <h1 className="mt-2 font-semibold tracking-tight text-4xl">Invitation expirée</h1>
            <p className="mt-3 text-sm text-muted">Demandez un nouveau lien à votre prestataire.</p>
          </>
        ) : null}
        {preview.status === "accepted" ? (
          <>
            <h1 className="mt-2 font-semibold tracking-tight text-4xl">Invitation déjà utilisée</h1>
            {session ? (
              <div className="mt-4">
                <ButtonLink href={`/mariage/${preview.weddingId}`}>Ouvrir le mariage</ButtonLink>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">Connectez-vous avec le compte qui a accepté l&apos;invitation.</p>
            )}
          </>
        ) : null}
        {preview.status === "pending" ? (
          <>
            <h1 className="mt-2 font-semibold tracking-tight text-4xl">
              {weddingTitle(preview.partnerOne, preview.partnerTwo)}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {formatLongDate(preview.weddingDate)}
              {preview.venueName ? ` · ${preview.venueName}` : ""}
            </p>
            <p className="mt-4 text-sm leading-6">
              Cette invitation est destinée à <strong>{preview.email}</strong> en tant que{" "}
              {preview.role === "vendor" ? "prestataire" : "couple"}.
            </p>
            {query.error ? (
              <div className="mt-4">
                <Alert>{query.error}</Alert>
              </div>
            ) : null}
            {session ? (
              <form action={acceptInvitation} className="mt-6">
                <input type="hidden" name="token" value={token} />
                <Button type="submit">Rejoindre le mariage</Button>
              </form>
            ) : (
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <ButtonLink
                  href={`/inscription?next=${encodeURIComponent(next)}&email=${encodeURIComponent(preview.email)}&role=${preview.role}`}
                >
                  Créer un compte
                </ButtonLink>
                <ButtonLink
                  href={`/connexion?next=${encodeURIComponent(next)}`}
                  variant="secondary"
                >
                  J&apos;ai déjà un compte
                </ButtonLink>
              </div>
            )}
          </>
        ) : null}
        <p className="mt-6 text-sm">
          <Link href="/" className="text-muted underline">
            Retour à l&apos;accueil
          </Link>
        </p>
      </Card>
    </Container>
  );
}
