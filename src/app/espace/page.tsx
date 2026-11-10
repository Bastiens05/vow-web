import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { formatLongDate, todayIso, weddingTitle } from "@/lib/domain/format";
import { partitionWeddings } from "@/lib/domain/access";
import { listMyWeddings } from "@/server/data";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const session = await requireSession();
  const weddings = await listMyWeddings(session.userId);
  const { upcoming, past } = partitionWeddings(
    weddings.map((wedding) => ({ ...wedding, weddingDate: wedding.wedding_date })),
    todayIso(),
  );
  const isVendor = session.profile.role === "vendor";
  const name = isVendor
    ? session.vendor?.business_name || session.profile.full_name
    : session.profile.full_name;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHeader
        eyebrow={isVendor ? "Prestataire" : "Couple"}
        title={name || "Votre espace"}
        description={
          isVendor
            ? "Les mariages dont vous êtes membre, du plus proche au plus lointain."
            : "Les mariages auxquels vous avez été invité."
        }
        actions={
          isVendor ? (
            <>
              <ButtonLink href="/espace/mariages/nouveau">Nouveau mariage</ButtonLink>
              <ButtonLink href="/espace/profil" variant="secondary">
                Ma vitrine
              </ButtonLink>
            </>
          ) : null
        }
      />
      {isVendor && !session.vendor ? (
        <div className="mb-6">
          <EmptyState title="Votre vitrine n'est pas encore créée">
            <ButtonLink href="/espace/profil">Compléter le profil</ButtonLink>
          </EmptyState>
        </div>
      ) : null}
      <WeddingSection title="À venir" items={upcoming} empty="Aucun mariage à venir." />
      <div className="mt-10">
        <WeddingSection title="Passés" items={past} empty="Aucun mariage passé." />
      </div>
    </div>
  );
}

function WeddingSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{
    id: string;
    partner_one_name: string;
    partner_two_name: string;
    wedding_date: string;
    venue_name: string;
    venue_city: string;
  }>;
  empty: string;
}) {
  return (
    <section>
      <h2 className="mb-4 font-serif text-3xl">{title}</h2>
      {items.length === 0 ? <p className="text-sm text-muted">{empty}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((wedding) => (
          <Card key={wedding.id}>
            <p className="text-[11px] uppercase tracking-[0.18em] text-gold-deep">
              {formatLongDate(wedding.wedding_date)}
            </p>
            <h3 className="mt-2 font-serif text-3xl">
              {weddingTitle(wedding.partner_one_name, wedding.partner_two_name)}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {[wedding.venue_name, wedding.venue_city].filter(Boolean).join(" · ") || "Lieu à préciser"}
            </p>
            <div className="mt-4">
              <ButtonLink href={`/mariage/${wedding.id}`} variant="secondary">
                Ouvrir l&apos;espace
              </ButtonLink>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
