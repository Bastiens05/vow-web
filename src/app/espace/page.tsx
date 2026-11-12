import type { Metadata } from "next";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { WeddingDirectory } from "@/components/wedding/wedding-directory";
import { CoupleCreateForm } from "@/components/account/couple-create-form";
import { coupleNextActions, daysUntil, heroCountdown } from "@/lib/domain/next-actions";
import { categoryLabel } from "@/lib/domain/categories";
import { AddVendorInvite } from "@/components/wedding/invite-block";
import { VendorBubbles } from "@/components/wedding/vendor-bubbles";
import { publicObjectUrl } from "@/lib/storage";
import { coupleChecklist, coupleSteps, dedupeTasks, firstRunSteps, openSteps, vendorSteps } from "@/lib/domain/checklist";
import { compareWeddingTimes, parisClockMinutes, selectLiveStep } from "@/lib/domain/day";
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
        <header className="mb-8">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Votre mariage</h1>
          <p className="mt-3 max-w-xl text-base text-muted">Créez votre espace, puis invitez vos prestataires.</p>
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
          {ledger.openQuotes + ledger.pendingDeposits + ledger.pendingReviews > 0 ? (
            <Card>
              <p className="text-xs text-muted">À traiter</p>
              <p className="mt-1 text-2xl font-semibold">{ledger.openQuotes + ledger.pendingDeposits + ledger.pendingReviews}</p>
              <p className="mt-1 text-xs text-muted">devis, acomptes, avis</p>
            </Card>
          ) : null}
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
      {!isVendor && !primary ? <CoupleCreateForm /> : null}
      {!isVendor && primary ? (
        <CoupleHome
          weddingId={primary.id}
          userId={session.userId}
          days={countdown}
          focus={focus}
          extra={actions.filter((action) => !["practical", "photos", "groups", "guests"].includes(action.id))}
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
  const countdown = heroCountdown(days);
  const compact = days === null || days <= 0;
  return (
    <header className="mb-10">
      <p className={`${compact ? "text-5xl sm:text-6xl" : "text-7xl sm:text-8xl"} font-semibold tracking-tight`}>{countdown.figure}</p>
      {countdown.caption ? <p className="mt-2 text-sm text-muted">{countdown.caption}</p> : null}
      <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-3 text-base text-muted">{[date, venue].filter(Boolean).join(" · ")}</p>
    </header>
  );
}

async function CoupleHome({
  weddingId,
  userId,
  days,
  focus,
  extra,
}: {
  weddingId: string;
  userId: string;
  days: number | null;
  focus: Awaited<ReturnType<typeof getCoupleFocus>> | null;
  extra: { id: string; label: string; href: string; done?: boolean }[];
}) {
  const supabase = await createClient();
  const [{ data: notes }, { data: slots }, { data: directory }, { data: vault }] = await Promise.all([
    supabase.from("messages").select("author_id, body, created_at, vendor_user_id").eq("wedding_id", weddingId).order("created_at", { ascending: false }).limit(40),
    supabase.from("timeline_slots").select("title, starts_at, place, sort_order").eq("wedding_id", weddingId),
    supabase.rpc("wedding_directory", { p_wedding_id: weddingId }),
    supabase.from("vault_items").select("id").eq("wedding_id", weddingId).limit(1),
  ]);
  const vendors = (directory ?? []).filter((person) => person.member_role === "vendor");
  const { data: logoRows } = vendors.length
    ? await supabase.from("vendor_profiles").select("user_id, logo_path").in("user_id", vendors.map((person) => person.user_id))
    : { data: [] as { user_id: string; logo_path: string | null }[] };
  const logos = new Map((logoRows ?? []).map((row) => [row.user_id, row.logo_path ? publicObjectUrl("vendor-media", row.logo_path) : null]));
  const photo =
    vendors.find((person) => person.category === "photographer") ??
    vendors.find((person) => person.category === "videographer") ??
    vendors.find((person) => person.category === "planner");
  const caterer =
    vendors.find((person) => person.category === "caterer") ??
    vendors.find((person) => person.category === "venue") ??
    vendors.find((person) => person.category === "planner");
  const tasks = dedupeTasks([
    ...coupleChecklist({
      weddingId,
      hasPractical: Boolean(focus?.hasPractical),
      needsPhotos: Boolean(focus?.needsPhotos),
      hasPhotos: Boolean(focus?.hasPhotos),
      photoVendorId: photo?.user_id ?? null,
      needsGuests: Boolean(focus?.needsGuests),
      hasGuests: Boolean(focus?.hasGuests),
      guestVendorId: caterer?.user_id ?? null,
      hasTimeline: Boolean(focus?.hasTimeline),
      pendingSignature: Boolean(focus?.pendingSignature),
      hasVault: (vault ?? []).length > 0,
    }),
    ...extra.map((item) => ({ ...item, done: item.done ?? false })),
  ]);
  const seen = new Set<string>();
  const unread = (notes ?? []).filter((note) => {
    const key = note.vendor_user_id ?? note.author_id;
    if (seen.has(key)) return false;
    seen.add(key);
    return note.author_id !== userId;
  });
  const ordered = [...(slots ?? [])].sort((a, b) => compareWeddingTimes(a.starts_at, b.starts_at) || a.sort_order - b.sort_order);
  const live = days === 0 ? selectLiveStep(ordered.map((slot) => ({ ...slot, startsAt: slot.starts_at })), parisClockMinutes()) : null;
  return (
    <>
      <section className="mb-8">
        <h2 className="text-sm font-medium text-muted">À faire</h2>
        <ul className="mt-4 grid gap-3">
          {tasks.map((step) => (
            <li key={step.id}>
              <Link href={step.href} className="flex min-h-16 items-center gap-4 rounded-2xl border border-line bg-paper px-4 transition active:scale-[0.99]">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${step.done ? "bg-ok" : "bg-danger"}`} aria-hidden />
                <span className="sr-only">{step.done ? "Fait" : "À faire"}</span>
                <span className="text-base font-medium">{step.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      {unread.length > 0 ? (
        <Link href={`/mariage/${weddingId}/messages`} className="mb-8 block min-w-0 overflow-hidden rounded-2xl border border-line bg-paper p-4">
          <p className="text-sm font-medium">Messages non lus</p>
          <p className="mt-2 truncate text-sm text-muted">{unread[0]?.body}</p>
        </Link>
      ) : null}
      {live ? (
        <Link href={`/mariage/${weddingId}/jour`} className="mb-8 block min-w-0 overflow-hidden rounded-2xl border border-line bg-paper p-5">
          <p className="text-sm font-medium">Prochaine étape du Jour J</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight">{formatSlotTime(live.starts_at)}</p>
          <p className="mt-1 truncate text-sm">{live.title}</p>
          {live.place ? <p className="truncate text-sm text-muted">{live.place}</p> : null}
        </Link>
      ) : null}
      <section className="mb-8 min-w-0">
        <h2 className="text-sm font-medium text-muted">Prestataires</h2>
        {vendors.length === 0 ? <p className="mt-3 text-sm text-muted">Aucun prestataire pour l&apos;instant.</p> : null}
        <div className="mt-4">
          <VendorBubbles
            weddingId={weddingId}
            people={vendors.map((person) => ({
              userId: person.user_id,
              businessName: person.business_name,
              fullName: person.full_name,
              category: person.category,
              phone: person.phone,
              email: person.email,
              logoUrl: logos.get(person.user_id) ?? null,
            }))}
          />
        </div>
        <AddVendorInvite weddingId={weddingId} />
      </section>
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
