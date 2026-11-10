import type { Metadata } from "next";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { WeddingDirectory } from "@/components/wedding/wedding-directory";
import { openCoupleDemo } from "@/server/actions/account";
import { countdownLabel, coupleNextActions, daysUntil } from "@/lib/domain/next-actions";
import { categoryLabel } from "@/lib/domain/categories";
import { coupleSteps, openSteps, vendorSteps } from "@/lib/domain/checklist";
import { formatLongDate, todayIso, weddingTitle } from "@/lib/domain/format";
import { partitionWeddings } from "@/lib/domain/access";
import { formatEuros } from "@/lib/domain/money";
import { createClient } from "@/lib/supabase/server";
import { moderateReview } from "@/server/actions/ledger";
import { getCoupleFocus, getDashboardSignals, listMyWeddings } from "@/server/data";
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
  const focus = !isVendor && primary ? await getCoupleFocus(primary.id) : null;
  const countdown = primary ? daysUntil(primary.wedding_date, todayIso()) : null;
  const actions = focus && primary ? coupleNextActions({ weddingId: primary.id, ...focus }) : [];
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
  const ledger = isVendor && session.vendor ? await vendorLedger(session.vendor.id) : null;

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
      {ledger ? (
        <section className="mb-8 grid gap-3 sm:grid-cols-3">
          <Card>
            <p className="text-xs text-muted">Encaissé cette année</p>
            <p className="mt-1 text-2xl font-semibold">{formatEuros(ledger.revenueCents)}</p>
          </Card>
          <Card>
            <p className="text-xs text-muted">Mariages à venir</p>
            <p className="mt-1 text-2xl font-semibold">{upcoming.filter((wedding) => !wedding.isDemo).length}</p>
          </Card>
          <Card>
            <p className="text-xs text-muted">À traiter</p>
            <p className="mt-1 text-2xl font-semibold">{ledger.openQuotes + ledger.pendingDeposits + ledger.pendingReviews}</p>
            <p className="mt-1 text-xs text-muted">devis, acomptes, avis</p>
          </Card>
        </section>
      ) : null}
      {ledger && ledger.reviews.length > 0 ? (
        <section className="mb-8 grid gap-2">
          <h2 className="text-sm font-medium text-muted">Avis à publier</h2>
          {ledger.reviews.map((review) => (
            <Card key={review.id} className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">{review.rating}/5 · {review.body || "Sans commentaire"}</p>
              <form action={moderateReview} className="flex gap-2">
                <input type="hidden" name="id" value={review.id} />
                <input type="hidden" name="status" value="published" />
                <Button type="submit" variant="secondary">Publier</Button>
              </form>
            </Card>
          ))}
        </section>
      ) : null}
      {isVendor ? (
        <form action={openCoupleDemo} className="mb-8">
          <Button type="submit" variant="secondary">
            Tester l&apos;espace mariés
          </Button>
        </form>
      ) : null}
      {!isVendor && primary ? (
        <section className="mb-8">
          <p className="text-sm text-gold-deep">{weddingTitle(primary.partner_one_name, primary.partner_two_name)}</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight">{countdownLabel(countdown)}</p>
          <p className="mt-1 text-sm text-muted">{formatLongDate(primary.wedding_date)}</p>
          <h2 className="mb-3 mt-6 text-sm font-medium text-muted">À faire</h2>
          {actions.length === 0 ? <p className="text-sm text-muted">Rien d&apos;urgent pour le moment.</p> : null}
          <ol className="grid gap-2">
            {actions.map((action, index) => (
              <li key={action.id}>
                <a href={action.href} className="flex min-h-14 items-center gap-3 rounded-2xl bg-paper px-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ivory text-xs font-semibold">{index + 1}</span>
                  <span className="text-sm font-medium">{action.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {isVendor && steps.length > 0 ? (
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
      ) : isVendor ? (
        <p className="mb-8 text-sm text-muted">Tout est en place pour le moment.</p>
      ) : null}
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

async function vendorLedger(vendorId: string) {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const [invoices, quotes, deposits, reviews] = await Promise.all([
    supabase.from("invoices").select("amount_cents, status, created_at").eq("vendor_id", vendorId),
    supabase.from("quotes").select("id, status").eq("vendor_id", vendorId).eq("status", "sent"),
    supabase.from("deposits").select("id, status").eq("vendor_id", vendorId).in("status", ["pending", "reminded"]),
    supabase.from("reviews").select("id, rating, body, status").eq("vendor_id", vendorId).eq("status", "pending"),
  ]);
  const revenueCents = (invoices.data ?? [])
    .filter((row) => row.status === "paid" && row.created_at.startsWith(String(year)))
    .reduce((sum, row) => sum + row.amount_cents, 0);
  return {
    revenueCents,
    openQuotes: (quotes.data ?? []).length,
    pendingDeposits: (deposits.data ?? []).length,
    pendingReviews: (reviews.data ?? []).length,
    reviews: reviews.data ?? [],
  };
}
