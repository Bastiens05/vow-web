import type { Metadata } from "next";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { WeddingDirectory } from "@/components/wedding/wedding-directory";
import { openCoupleDemo } from "@/server/actions/account";
import { categoryLabel } from "@/lib/domain/categories";
import { coupleSteps, openSteps, vendorSteps } from "@/lib/domain/checklist";
import { todayIso } from "@/lib/domain/format";
import { partitionWeddings } from "@/lib/domain/access";
import { getDashboardSignals, listMyWeddings } from "@/server/data";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Accueil" };

export default async function DashboardPage() {
  const session = await requireSession();
  const weddings = await listMyWeddings(session.userId);
  const { upcoming, past } = partitionWeddings(
    weddings.map((wedding) => ({ ...wedding, weddingDate: wedding.wedding_date, isDemo: wedding.is_demo })),
    todayIso(),
  );
  const isVendor = session.profile.role === "vendor";
  const primary = upcoming.find((wedding) => !wedding.isDemo) ?? upcoming[0] ?? past[0] ?? null;
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
        eyebrow={isVendor ? `Espace prestataire${session.vendor ? ` · ${categoryLabel(session.vendor.category)}` : ""}` : "Espace mariés"}
        title={name || "Votre espace"}
        description={
          isVendor
            ? "Vos mariages et votre vitrine. Le jour J, le couple tient les horaires."
            : "Votre mariage. Le jour J, c'est vous qui prévenez les prestataires."
        }
        actions={
          isVendor ? (
            <ButtonLink href="/espace/mariages/nouveau">Nouveau mariage</ButtonLink>
          ) : null
        }
      />
      {isVendor ? (
        <form action={openCoupleDemo} className="mb-8">
          <Button type="submit" variant="secondary">
            Tester l&apos;espace mariés
          </Button>
        </form>
      ) : null}
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
      <WeddingDirectory weddings={weddings} />
    </div>
  );
}
