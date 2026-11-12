import { listInvitations } from "@/server/data";
import { requireSession } from "@/server/session";
import { LinkInvite } from "@/components/wedding/link-invite";

export async function InviteBlock({
  weddingId,
  role,
  title,
  intro,
  emailLabel,
  submitLabel,
  withName = false,
  withTrade = false,
  quiet = false,
}: {
  weddingId: string;
  role: "vendor" | "couple";
  title: string;
  intro: string;
  emailLabel: string;
  submitLabel: string;
  withName?: boolean;
  withTrade?: boolean;
  quiet?: boolean;
}) {
  const session = await requireSession();
  const invitations = (await listInvitations(weddingId)).filter(
    (row) => row.invited_by === session.userId,
  );
  return (
    <LinkInvite
      weddingId={weddingId}
      role={role}
      invitations={invitations}
      title={title}
      intro={intro}
      emailLabel={emailLabel}
      submitLabel={submitLabel}
      withName={withName}
      withTrade={withTrade}
      quiet={quiet}
    />
  );
}

export function AddVendorInvite({ weddingId }: { weddingId: string }) {
  return (
    <InviteBlock
      weddingId={weddingId}
      role="vendor"
      title="Ajouter un prestataire"
      intro="Un e-mail suffit. Le nom et le métier sont facultatifs. Le lien reste ici, et un message part si l'envoi est configuré."
      emailLabel="E-mail du prestataire"
      submitLabel="Ajouter un prestataire"
      withName
      withTrade
    />
  );
}

export function InviteCoupleBlock({ weddingId }: { weddingId: string }) {
  return (
    <InviteBlock
      weddingId={weddingId}
      role="couple"
      title="Inviter le couple"
      intro="Un e-mail. S'ils ont déjà un compte, ils rejoignent le mariage en un geste après la connexion."
      emailLabel="E-mail du couple"
      submitLabel="Envoyer l'invitation"
    />
  );
}

export function InvitePartnerBlock({ weddingId }: { weddingId: string }) {
  return (
    <InviteBlock
      weddingId={weddingId}
      role="couple"
      title="L'autre partenaire"
      intro="Même mariage, même espace. L'invitation est liée à cette adresse."
      emailLabel="E-mail"
      submitLabel="Envoyer l'invitation"
      quiet
    />
  );
}

export function InvitePeerBlock({ weddingId }: { weddingId: string }) {
  return (
    <InviteBlock
      weddingId={weddingId}
      role="vendor"
      title="Un confrère"
      intro="Pour un autre métier déjà en contact avec vous. Le couple peut aussi l'ajouter de son côté."
      emailLabel="E-mail du confrère"
      submitLabel="Inviter un confrère"
      quiet
    />
  );
}
