import { Button, ButtonLink } from "@/components/ui/button";
import { acceptTeamInvite } from "@/server/actions/suite";
import { getSession } from "@/server/session";

export default async function TeamInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const session = await getSession();
  const next = `/equipe/${token}`;
  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col justify-center px-5 py-16">
      <p className="text-sm font-semibold tracking-[0.28em]">VOW</p>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">Rejoindre l&apos;équipe</h1>
      <p className="mt-3 text-base leading-7 text-muted">
        Vous verrez les mariages de l&apos;activité. La facturation reste au titulaire.
      </p>
      {query.error ? <p className="mt-4 text-sm text-red-700">{query.error}</p> : null}
      {session ? (
        <form action={acceptTeamInvite} className="mt-8">
          <input type="hidden" name="token" value={token} />
          <Button type="submit">Rejoindre</Button>
        </form>
      ) : (
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={`/inscription?role=vendor&next=${encodeURIComponent(next)}`}>Créer mon compte</ButtonLink>
          <ButtonLink href={`/connexion?next=${encodeURIComponent(next)}`} variant="secondary">
            J&apos;ai déjà un compte
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
