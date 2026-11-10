import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReviewForm } from "@/components/wedding/review-form";
import { canDeliver } from "@/lib/domain/trades";
import { createClient } from "@/lib/supabase/server";
import { setReminders } from "@/server/actions/signatures";
import { getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Mariage" };

export default async function WeddingOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const supabase = await createClient();
  const vendorIds = space.members.filter((member) => member.role === "vendor").map((member) => member.userId);
  const [{ data: vendors }, { data: reminders }] = await Promise.all([
    vendorIds.length
      ? supabase.from("vendor_profiles").select("id, business_name, user_id").in("user_id", vendorIds)
      : Promise.resolve({ data: [] as { id: string; business_name: string; user_id: string }[] }),
    supabase.from("reminders").select("id, milestone, kind, created_at").eq("wedding_id", id).order("created_at", { ascending: false }),
  ]);
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
          <ButtonLink href={`/mariage/${id}/questions`} variant="secondary">
            Questions
          </ButtonLink>
          <ButtonLink href={`/mariage/${id}/carte`} variant="secondary">
            Carte
          </ButtonLink>
          <ButtonLink href={`/mariage/${id}/equipe`} variant="secondary">
            Équipe
          </ButtonLink>
          {canDeliver(space.actingAsCouple ? "couple" : space.role, space.session.vendor?.category ?? null) ? (
            <ButtonLink href={`/mariage/${id}/galerie`} variant="secondary">
              Galerie
            </ButtonLink>
          ) : null}
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
          {!space.actingAsCouple && space.role === "vendor" ? (
            <form action={setReminders}>
              <input type="hidden" name="wedding_id" value={id} />
              <input type="hidden" name="enabled" value={space.wedding.reminders_enabled ? "off" : "on"} />
              <Button type="submit" variant="secondary">
                {space.wedding.reminders_enabled ? "Couper les rappels" : "Activer les rappels"}
              </Button>
            </form>
          ) : null}
        </div>
      </Card>
      {space.actingAsCouple ? (
        <ReviewForm weddingId={id} vendors={(vendors ?? []).map((vendor) => ({ id: vendor.id, name: vendor.business_name }))} />
      ) : null}
      {(reminders ?? []).length > 0 ? (
        <Card>
          <h2 className="text-lg font-semibold tracking-tight">Rappels envoyés</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(reminders ?? []).map((reminder) => (
              <li key={reminder.id}>
                J-{reminder.milestone} · {reminder.kind}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
