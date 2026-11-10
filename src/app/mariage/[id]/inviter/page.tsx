import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvitePanel } from "@/components/wedding/invite-panel";
import { Card } from "@/components/ui/card";
import { getWeddingSpace, listInvitations } from "@/server/data";

export const metadata: Metadata = { title: "Invitations" };

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  if (space.role !== "vendor") notFound();
  const invitations = await listInvitations(id);
  return (
    <Card>
      <h2 className="font-semibold tracking-tight text-3xl">Inviter</h2>
      <p className="mt-1 mb-6 text-sm leading-6 text-muted">
        Le lien est lié à l&apos;adresse indiquée. La personne doit créer son compte, ou se connecter, avec exactement cet e-mail.
        L&apos;envoi se fait depuis votre messagerie : VOW affiche le lien, il ne l&apos;expédie pas tout seul.
      </p>
      <InvitePanel weddingId={id} invitations={invitations} />
    </Card>
  );
}
