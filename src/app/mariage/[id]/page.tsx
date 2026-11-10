import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Mariage" };

export default async function WeddingOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <h2 className="font-serif text-3xl">Membres</h2>
        <ul className="mt-4 space-y-3">
          {space.members.map((member) => (
            <li key={member.userId} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{member.fullName}</p>
                <p className="text-xs text-muted">{member.email}</p>
              </div>
              <Badge>{member.role === "vendor" ? "Prestataire" : "Couple"}</Badge>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="font-serif text-3xl">Cet espace</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Messages, documents et déroulé du jour sont réservés aux personnes invitées sur ce mariage.
          {space.role === "vendor"
            ? " Vous pouvez inviter le couple, ou un autre prestataire, depuis l'onglet Invitations."
            : " Vous pouvez lire le déroulé et le commenter."}
        </p>
      </Card>
    </div>
  );
}
