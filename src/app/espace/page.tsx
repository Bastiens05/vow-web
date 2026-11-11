import type { Metadata } from "next";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { WeddingDirectory } from "@/components/wedding/wedding-directory";
import { openCoupleDemo } from "@/server/actions/account";
import { coupleNextActions, daysUntil } from "@/lib/domain/next-actions";
import { categoryLabel } from "@/lib/domain/categories";
import { coupleSteps, firstRunSteps, openSteps, vendorSteps, type Step } from "@/lib/domain/checklist";
import { coupleHeroTitle, formatLongDate, formatSlotTime, todayIso } from "@/lib/domain/format";
import { partitionWeddings, preferredCoupleWedding } from "@/lib/domain/access";
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
  const coupleWedding = preferredCoupleWedding(weddings, session.userId);
  const primary = isVendor
    ? (upcoming.find((wedding) => !wedding.isDemo) ?? upcoming[0] ?? past[0] ?? null)
    : coupleWedding;
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
  const realWeddings = weddings.filter((wedding) => !wedding.is_demo);
  const firstRun = isVendor
    ? firstRunSteps({
        profileReady: Boolean(session.vendor?.business_name && session.vendor.city.trim()),
        weddingId: realWeddings[0]?.id ?? null,
        coupleJoined: realWeddings.some((wedding) => wedding.coupleJoined),
      })
    : [];
  const name = isVendor ? session.vendor?.business_name || session.profile.full_name : session.profile.full_name;
  const ledger = isVendor && session.vendor ? await vendorLedger(session.vendor.id) : null;
  const supabase = await createClient();
  const { data: recos } = isVendor
    ? await supabase.from("recommendations").select("id").eq("from_user_id", session.userId)
    : { data: [] as { id: string }[] };
  const recoIds = (recos ?? []).map((row) => row.id);
  const { data: recoEvents } = recoIds.length
    ? await supabase.from("recommendation_events").select("kind").in("recommendation_id", recoIds)
    : { data: [] as { kind: string }[] };
  const recoClicks = (recoEvents ?? []).filter((event) => event.kind === "click").length;
  const recoLeads = (recoEvents ?? []).filter((event) => event.kind === "lead").length;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8">
      {isVendor ? (
        <PageHeader
          eyebrow={`Espace prestataire${session.vendor ? ` · ${categoryLabel(session.vendor.category)}` : ""}`}
          title={name || "Votre espace"}
          description="Vos mariages et votre vitrine. Le jour J, le couple tient les horaires."
          actions={realWeddings.length > 0 ? <ButtonLink href="/espace/mariages/nouveau">Nouveau mariage</ButtonLink> : null}
        />
      ) : primary ? (
        <CoupleHero
          days={countdown}
          title={coupleHeroTitle(primary.partner_one_name, primary.partner_two_name)}
          date={formatLongDate(primary.wedding_date)}
          venue={[primary.venue_name, primary.venue_city].filter(Boolean).join(" · ")}
        />
      ) : (
        <header className="mb-10">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Votre mariage</h1>
          <p className="mt-3 max-w-xl text-base text-muted">L&apos;espace est vide. Une invitation vous y fait entrer.</p>
        </header>
      )}
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
      {isVendor && recoIds.length > 0 ? (
        <p className="mb-8 text-sm text-muted">
          Recommandations · {recoClicks} clics · {recoLeads} demandes
        </p>
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
        <CoupleHome
          weddingId={primary.id}
          steps={coupleSteps({
            primaryWeddingId: primary.id,
            hasPractical: Boolean(focus?.hasPractical),
            hasPhotoGroups: Boolean(focus?.hasPhotos),
            hasGuests: Boolean(focus?.hasGuests),
          })}
          extra={actions.filter((action) => !["practical", "groups", "guests"].includes(action.id))}
        />
      ) : null}
      {isVendor && realWeddings.length === 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-muted">Pour commencer</h2>
          <ol className="grid gap-2">
            {firstRun.map((step, index) => (
              <li key={step.id}>
                <a href={step.href} className="flex min-h-14 items-center gap-3 rounded-2xl bg-paper px-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ivory text-xs font-semibold">
                    {step.done ? "✓" : index + 1}
                  </span>
                  <span className="text-sm font-medium">{step.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      ) : isVendor && steps.length > 0 ? (
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
      {isVendor ? <WeddingDirectory weddings={weddings} /> : null}
    </div>
  );
}

function CoupleHero({ days, title, date, venue }: { days: number | null; title: string; date: string; venue: string }) {
  const value = days === null ? "—" : String(Math.max(days, 0));
  const label = days === null ? "date à confirmer" : days > 1 ? "jours" : days === 1 ? "jour" : days === 0 ? "aujourd'hui" : "passé";
  return (
    <header className="mb-10">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">{label}</p>
      <p className="mt-2 text-7xl font-semibold tracking-tight sm:text-8xl">{value}</p>
      <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-3 text-base text-muted">{[date, venue].filter(Boolean).join(" · ")}</p>
    </header>
  );
}

async function CoupleHome({ weddingId, steps, extra }: { weddingId: string; steps: Step[]; extra: { id: string; label: string; href: string }[] }) {
  const supabase = await createClient();
  const [{ data: notes }, { data: nextSlot }] = await Promise.all([
    supabase.from("messages").select("body, created_at").eq("wedding_id", weddingId).order("created_at", { ascending: false }).limit(2),
    supabase.from("timeline_slots").select("title, starts_at, place").eq("wedding_id", weddingId).order("starts_at").limit(1).maybeSingle(),
  ]);
  const cards = [
    ...steps.map((step) => ({ ...step, done: step.done })),
    ...extra.map((step) => ({ ...step, done: false })),
  ];
  return (
    <>
      <section className="mb-8">
        <h2 className="text-sm font-medium text-muted">À faire</h2>
        <ul className="mt-4 grid gap-3">
          {cards.map((step) => (
            <li key={step.id}>
              <a href={step.href} className="flex min-h-16 items-center gap-4 rounded-2xl border border-line bg-paper px-4 transition active:scale-[0.99]">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${step.done ? "bg-ok" : "bg-danger"}`} aria-hidden />
                <span className="sr-only">{step.done ? "Fait" : "À faire"}</span>
                <span className="text-base font-medium">{step.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <Link href={`/mariage/${weddingId}/messages`} className="rounded-2xl border border-line bg-paper p-5 transition active:scale-[0.99]">
          <p className="text-sm font-medium">Derniers messages</p>
          {(notes ?? []).length === 0 ? <p className="mt-3 text-sm text-muted">Aucun message pour l&apos;instant.</p> : null}
          <ul className="mt-3 space-y-2">
            {(notes ?? []).map((note) => (
              <li key={note.created_at} className="truncate text-sm text-muted">{note.body}</li>
            ))}
          </ul>
        </Link>
        <Link href={`/mariage/${weddingId}/jour`} className="rounded-2xl border border-line bg-paper p-5 transition active:scale-[0.99]">
          <p className="text-sm font-medium">Prochaine étape du Jour J</p>
          {nextSlot ? (
            <>
              <p className="mt-3 text-2xl font-semibold tracking-tight">{formatSlotTime(nextSlot.starts_at)}</p>
              <p className="mt-1 text-sm">{nextSlot.title}</p>
              {nextSlot.place ? <p className="text-sm text-muted">{nextSlot.place}</p> : null}
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">Le déroulé n&apos;est pas encore posé.</p>
          )}
        </Link>
      </div>
    </>
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
