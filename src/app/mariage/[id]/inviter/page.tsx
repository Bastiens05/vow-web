import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddVendorInvite, InviteCoupleBlock, InvitePartnerBlock, InvitePeerBlock } from "@/components/wedding/invite-block";
import { Card } from "@/components/ui/card";
import { getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Invitations" };

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const couple = space.role === "couple" || space.actingAsCouple;
  if (!couple && space.role !== "vendor") notFound();
  return (
    <Card>
      {couple ? (
        <>
          <AddVendorInvite weddingId={id} />
          <InvitePartnerBlock weddingId={id} />
        </>
      ) : (
        <>
          <InviteCoupleBlock weddingId={id} />
          <InvitePeerBlock weddingId={id} />
        </>
      )}
    </Card>
  );
}
