import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { setReminders } from "@/server/actions/signatures";
import { getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Mariage" };

export default async function WeddingOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const supabase = await createClient();
  const { data: reminders } = await supabase
    .from("reminders")
    .select("id, milestone, kind, created_at")
    .eq("wedding_id", id)
    .order("created_at", { ascending: false });
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
