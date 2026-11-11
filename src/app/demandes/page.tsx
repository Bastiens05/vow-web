import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectInput } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { leadStatusLabel } from "@/lib/domain/leads";
import { formatLongDate } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/server";
import { createWeddingFromLead, setLeadStatus } from "@/server/actions/leads";
import { requireSession } from "@/server/session";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Demandes" };

const STATUSES = ["nouvelle", "en_discussion", "gagnee", "perdue"] as const;

export default async function LeadsPage() {
  const session = await requireSession();
  if (session.profile.role !== "vendor" || !session.vendor) notFound();
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("vendor_id", session.vendor.id)
    .order("created_at", { ascending: false });
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8">
      <PageHeader
        eyebrow="Espace prestataire"
        title="Demandes"
        description={`Lien à coller dans une bio : /demande/${session.vendor.slug}`}
      />
      {(leads ?? []).length === 0 ? (
        <div className="mb-6">
          <EmptyState title="Aucune demande">
            {session.vendor.published ? (
              <ButtonLink href={`/p/${session.vendor.slug}`}>Voir votre page publique</ButtonLink>
            ) : (
              <ButtonLink href="/espace/profil">Complétez votre vitrine</ButtonLink>
            )}
          </EmptyState>
        </div>
      ) : null}
      <ul className="space-y-3">
        {(leads ?? []).map((lead) => (
          <li key={lead.id}>
            <Card className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight">{lead.full_names}</h2>
                <Badge>{leadStatusLabel(lead.status)}</Badge>
              </div>
              <p className="text-sm text-muted">
                {lead.email}
                {lead.phone ? ` · ${lead.phone}` : ""}
                {lead.wedding_date ? ` · ${formatLongDate(lead.wedding_date)}` : ""}
                {lead.place ? ` · ${lead.place}` : ""}
                {lead.guest_count !== null ? ` · ${lead.guest_count} invités` : ""}
              </p>
              {lead.message ? <p className="text-sm leading-6">{lead.message}</p> : null}
              <div className="flex flex-wrap items-center gap-2">
                <form action={setLeadStatus} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={lead.id} />
                  <SelectInput name="status" defaultValue={lead.status} aria-label="Statut">
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {leadStatusLabel(status)}
                      </option>
                    ))}
                  </SelectInput>
                  <Button type="submit" variant="secondary">
                    Mettre à jour
                  </Button>
                </form>
                {lead.wedding_id ? null : (
                  <form action={createWeddingFromLead}>
                    <input type="hidden" name="id" value={lead.id} />
                    <Button type="submit">Créer le mariage et inviter</Button>
                  </form>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
