import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { coupleSteps, openSteps, vendorSteps } from "@/lib/domain/checklist";
import { formatLongDate, todayIso, weddingTitle } from "@/lib/domain/format";
import { partitionWeddings } from "@/lib/domain/access";
import { getDashboardSignals, listMyWeddings } from "@/server/data";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Accueil" };

export default async function DashboardPage() {
  const session = await requireSession();
  const weddings = await listMyWeddings(session.userId);
  const { upcoming, past } = partitionWeddings(
    weddings.map((wedding) => ({ ...wedding, weddingDate: wedding.wedding_date })),
    todayIso(),
  );
  const isVendor = session.profile.role === "vendor";
  const primary = upcoming[0] ?? past[0] ?? null;
  const signals = await getDashboardSignals(primary ? [primary.id] : []);
  const steps = openSteps(
    isVendor
      ? vendorSteps({
          hasProfile: Boolean(session.vendor),
          published: Boolean(session.vendor?.published),
          weddingCount: weddings.length,
          primaryWeddingId: primary?.id ?? null,
          coupleJoined: signals.coupleJoined,
          hasTimeline: signals.hasTimeline,
          hasDocument: signals.hasDocument,
        })
      : coupleSteps({
          primaryWeddingId: primary?.id ?? null,
          hasPractical: signals.hasPractical,
          hasPhotoGroups: signals.hasPhotoGroups,
          hasGuests: signals.hasGuests,
        }),
  );
  const name = isVendor ? session.vendor?.business_name || session.profile.full_name : session.profile.full_name;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8">
      <PageHeader
        eyebrow={isVendor ? "Prestataire" : "Couple"}
        title={name || "Votre espace"}
        description={isVendor ? "Les mariages en cours, et ce qu'il reste à faire." : "Votre mariage, au même endroit."}
        actions={
          isVendor ? (
            <ButtonLink href="/espace/mariages/nouveau">Nouveau mariage</ButtonLink>
          ) : null
        }
      />
      {steps.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-muted">Prochaines étapes</h2>
          <ol className="grid gap-2">
            {steps.slice(0, 3).map((step, index) => (
              <li key={step.id}>
                <a
                  href={step.href}
                  className="flex min-h-14 items-center gap-3 rounded-2xl bg-paper px-4 active:scale-[0.99]"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ivory text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{step.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <p className="mb-8 text-sm text-muted">Tout est en place pour le moment.</p>
      )}
      {isVendor && !session.vendor ? (
        <div className="mb-8">
          <EmptyState title="La vitrine n'est pas encore créée">
            <ButtonLink href="/espace/profil">Compléter le profil</ButtonLink>
          </EmptyState>
        </div>
      ) : null}
      <WeddingSection title="À venir" items={upcoming} empty="Aucun mariage à venir." />
      <div className="mt-8">
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
      <h2 className="mb-3 text-sm font-medium text-muted">{title}</h2>
      {items.length === 0 ? <p className="text-sm text-muted">{empty}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((wedding) => (
          <Card key={wedding.id} className="transition active:scale-[0.99]">
            <p className="text-xs font-medium text-gold-deep">{formatLongDate(wedding.wedding_date)}</p>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight">
              {weddingTitle(wedding.partner_one_name, wedding.partner_two_name)}
            </h3>
            <p className="mt-1 text-sm text-muted">
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
