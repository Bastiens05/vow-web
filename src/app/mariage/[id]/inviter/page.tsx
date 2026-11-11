import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvitePanel } from "@/components/wedding/invite-panel";
import { Card } from "@/components/ui/card";
import { getWeddingSpace, listInvitations } from "@/server/data";

export const metadata: Metadata = { title: "Invitations" };

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const couple = space.role === "couple" || space.actingAsCouple;
  if (!couple && space.role !== "vendor") notFound();
  const invitations = await listInvitations(id);
  return (
    <Card>
      <h2 className="font-semibold tracking-tight text-3xl">{couple ? "Inviter mon conjoint" : "Inviter"}</h2>
      <p className="mt-1 mb-6 text-sm leading-6 text-muted">
        {couple
          ? "Le lien est lié à cette adresse. La connexion sans mot de passe ouvre le même mariage, avec les mêmes droits."
          : "Le lien est lié à l'adresse indiquée. La personne crée son compte, ou se connecte, avec exactement cet e-mail."}
      </p>
      <InvitePanel weddingId={id} invitations={invitations} coupleOnly={couple} />
    </Card>
  );
}
