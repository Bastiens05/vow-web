import type { Metadata } from "next";
import { ContactFormLink } from "@/components/account/contact-form-link";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectInput } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { leadStatusLabel } from "@/lib/domain/leads";
import { formatLongDate } from "@/lib/domain/format";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createWeddingFromLead, setLeadStatus } from "@/server/actions/leads";
import { requireSession } from "@/server/session";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Demandes de contact" };

const STATUSES = ["nouvelle", "en_discussion", "gagnee", "perdue"] as const;

const STEPS = [
  { title: "Le lien", text: "Vous le copiez dans une bio ou sur votre site." },
  { title: "Le formulaire", text: "Le couple le remplit, sans créer de compte." },
  { title: "La demande", text: "Elle arrive ici, à transformer en mariage." },
];

export default async function LeadsPage() {
  const session = await requireSession();
  if (session.profile.role !== "vendor" || !session.vendor) notFound();
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("vendor_id", session.vendor.id)
    .order("created_at", { ascending: false });
  const rows = leads ?? [];
  const formUrl = `${siteUrl()}/demande/${session.vendor.slug}`;
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:py-10">
      <PageHeader
        eyebrow="Espace prestataire"
        title="Demandes de contact"
        description="Les futurs mariés qui remplissent votre formulaire public arrivent ici. Mettez ce lien dans votre bio Instagram ou sur votre site."
      />
      <Card className="mb-8">
        <ContactFormLink url={formUrl} />
      </Card>
      {rows.length === 0 ? (
        <Card>
          <h2 className="text-lg font-semibold tracking-tight">Aucune demande pour l&apos;instant</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-line bg-ivory/60 p-4">
                <p className="text-xs font-medium text-muted">{index + 1}</p>
                <p className="mt-2 font-medium">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
      <ul className="space-y-3">
        {rows.map((lead) => (
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
                {lead.wedding_id ? (
                  <ButtonLink href={`/mariage/${lead.wedding_id}`} variant="secondary">
                    Ouvrir le mariage
                  </ButtonLink>
                ) : (
                  <form action={createWeddingFromLead}>
                    <input type="hidden" name="id" value={lead.id} />
                    <Button type="submit">Créer le mariage</Button>
                  </form>
                )}
                <a className={buttonClass("secondary")} href={`mailto:${lead.email}?subject=${encodeURIComponent("Votre demande de contact")}`}>
                  Répondre
                </a>
                <form action={setLeadStatus} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={lead.id} />
                  <SelectInput name="status" defaultValue={lead.status} aria-label="Statut">
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {leadStatusLabel(status)}
                      </option>
                    ))}
                  </SelectInput>
                  <Button type="submit" variant="ghost">
                    Mettre à jour
                  </Button>
                </form>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
