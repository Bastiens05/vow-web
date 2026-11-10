import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReviewForm } from "@/components/wedding/review-form";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Mariage" };

export default async function WeddingOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const supabase = await createClient();
  const vendorIds = space.members.filter((member) => member.role === "vendor").map((member) => member.userId);
  const { data: vendors } = vendorIds.length
    ? await supabase.from("vendor_profiles").select("id, business_name, user_id").in("user_id", vendorIds)
    : { data: [] as { id: string; business_name: string; user_id: string }[] };
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card>
        <h2 className="text-lg font-semibold tracking-tight">Membres</h2>
        <ul className="mt-4 space-y-3">
          {space.members.map((member) => (
            <li key={member.userId} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{member.fullName}</p>
                <p className="text-xs text-muted">{member.email}</p>
              </div>
              <Badge>
                {space.actingAsCouple && member.userId === space.session.userId
                  ? "Essai mariés"
                  : member.role === "vendor"
                    ? "Prestataire"
                    : "Couple"}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {space.actingAsCouple ? "Votre rôle" : "Votre métier"}
        </h2>
        <p className="text-sm leading-6 text-muted">
          {space.actingAsCouple
            ? "Vous tenez les horaires du jour J et les infos du mariage. Les prestataires voient seulement ce qui concerne leur métier."
            : "Vous voyez le déroulé en direct. Le couple décale les horaires et vous envoie les alertes. Votre onglet pratique suit votre métier."}
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/mariage/${id}/devis`} variant="secondary">
            Devis et factures
          </ButtonLink>
          <ButtonLink href={`/mariage/${id}/jour`} variant="secondary">
            {space.actingAsCouple ? "Tenir le jour J" : "Voir le jour J"}
          </ButtonLink>
          <ButtonLink href={`/mariage/${id}/pratique`} variant="secondary">
            {space.actingAsCouple ? "Infos pratiques" : "Ma fiche"}
          </ButtonLink>
          {!space.actingAsCouple && space.role === "vendor" ? (
            <ButtonLink href={`/mariage/${id}/inviter`} variant="secondary">
              Inviter quelqu&apos;un
            </ButtonLink>
          ) : null}
        </div>
      </Card>
      {space.actingAsCouple ? (
        <ReviewForm weddingId={id} vendors={(vendors ?? []).map((vendor) => ({ id: vendor.id, name: vendor.business_name }))} />
      ) : null}
    </div>
  );
}
