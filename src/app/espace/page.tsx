import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CalendarRange, ChevronRight, Clock, FileText, Folder, Lock, MessageCircle, Plus, Shield, Wallet, type LucideIcon } from "lucide-react";
import { QuoteShortcut } from "@/components/account/quote-shortcut";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page-header";
import { WeddingDirectory } from "@/components/wedding/wedding-directory";
import { CoupleCreateForm } from "@/components/account/couple-create-form";
import { coupleNextActions, daysUntil, heroCountdown } from "@/lib/domain/next-actions";
import { categoryLabel } from "@/lib/domain/categories";
import { AddVendorInvite } from "@/components/wedding/invite-block";
import { VendorBubbles } from "@/components/wedding/vendor-bubbles";
import { publicObjectUrl } from "@/lib/storage";
import { coupleChecklist, dedupeTasks, firstRunSteps } from "@/lib/domain/checklist";
import { compareWeddingTimes, parisClockMinutes, selectLiveStep } from "@/lib/domain/day";
import { coupleHeroTitle, formatLongDate, formatSlotTime, todayIso, weddingTitle } from "@/lib/domain/format";
import { partitionWeddings, preferredCoupleWedding } from "@/lib/domain/access";
import { threadHasUnread } from "@/lib/domain/message-reads";
import { formatEuros } from "@/lib/domain/money";
import { quoteTarget, type VendorTodo } from "@/lib/domain/vendor-home";
import { createClient } from "@/lib/supabase/server";
import { moderateReview } from "@/server/actions/ledger";
import { getCoupleFocus, listMyWeddings, messageReadIds } from "@/server/data";
import { loadVendorFinance } from "@/server/finance";
import { loadVendorHome } from "@/server/vendor-home";
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
  const focus = !isVendor && primary ? await getCoupleFocus(primary.id) : null;
  const countdown = primary ? daysUntil(primary.wedding_date, todayIso()) : null;
  const actions = focus && primary ? coupleNextActions({ weddingId: primary.id, ...focus }) : [];
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
  const home = isVendor && session.vendor
    ? await loadVendorHome({
        userId: session.userId,
        vendorId: session.vendor.id,
        weddings,
        today: todayIso(),
      })
    : { todos: [] as VendorTodo[], steps: {} };
  const realUpcoming = upcoming.filter((wedding) => !wedding.isDemo);
  const quotePool = realUpcoming.length > 0 ? realUpcoming : upcoming.length > 0 ? upcoming : realWeddings.length > 0 ? realWeddings : weddings;
  const quoteWeddings = quotePool.map((wedding) => ({
    id: wedding.id,
    title: weddingTitle(wedding.partner_one_name, wedding.partner_two_name),
    date: wedding.wedding_date,
  }));
  const devisTarget = quoteTarget(quoteWeddings);
  const actionClass =
    "w-full max-sm:h-auto max-sm:min-h-[3.35rem] max-sm:flex-col max-sm:whitespace-normal max-sm:px-2.5 max-sm:py-2 max-sm:text-center max-sm:text-sm max-sm:leading-snug";
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
  const { count: newLeads } = isVendor && session.vendor
    ? await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", session.vendor.id)
        .eq("status", "nouvelle")
    : { count: 0 };

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8">
      {isVendor ? (
        <header className="mb-7 max-w-2xl">
          <p className="text-sm font-medium text-accent">
            {`Espace prestataire${session.vendor ? ` · ${categoryLabel(session.vendor.category)}` : ""}`}
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{name || "Votre espace"}</h1>
          <p className="mt-3 text-base leading-7 text-ink">Vos mariages et votre vitrine. Le jour J, le couple tient les horaires.</p>
        </header>
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
      {isVendor ? (
        <div className="mb-8 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <ButtonLink href="/espace/mariages/nouveau" className={actionClass}>
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Nouveau mariage
          </ButtonLink>
          <QuoteShortcut target={devisTarget} />
          <ButtonLink href="/messages" variant="secondary" className={actionClass}>
            <MessageCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Envoyer un message
          </ButtonLink>
          <ButtonLink href="/coffre-fort" variant="secondary" className={actionClass}>
            <Lock className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Partager un document du coffre
          </ButtonLink>
        </div>
      ) : null}
      {isVendor ? (
        <section className="mb-8 grid grid-cols-2 gap-3 sm:gap-4">
          <Link href="/tresorerie" className="block rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
            <SignalCard icon={Wallet} label="Encaissé cette année" value={formatEuros(ledger?.finance.collectedThisYearCents ?? 0)} detail="Paiements enregistrés" balanced />
          </Link>
          <SignalCard icon={CalendarRange} label="Mariages à venir" value={String(upcoming.filter((wedding) => !wedding.isDemo).length)} detail="Hors mariages de démonstration" balanced />
        </section>
      ) : null}
      {isVendor ? <VendorTodoList items={home.todos} /> : null}
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
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-accent text-base font-medium text-ink">
                    {step.done ? "✓" : index + 1}
                  </span>
                  <span className="text-base font-medium text-ink">{step.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {isVendor && !session.vendor ? (
        <div className="mb-8">
          <EmptyState title="La vitrine n'est pas encore créée">
            <ButtonLink href="/espace/profil">Compléter le profil</ButtonLink>
          </EmptyState>
        </div>
      ) : null}
      {isVendor ? <WeddingDirectory weddings={weddings} upcomingTitle="Prochains mariages" steps={home.steps} /> : null}
      {isVendor && (newLeads ?? 0) > 0 ? (
        <Link href="/demandes" className="mt-8 block">
          <SignalCard icon={Bell} label="Nouvelles demandes de contact" value={String(newLeads)} detail={newLeads === 1 ? "1 demande à lire" : `${newLeads} demandes à lire`} />
        </Link>
      ) : null}
      {isVendor && recoIds.length > 0 ? (
        <p className="mt-8 text-sm text-muted">
          Recommandations · {recoClicks} clics · {recoLeads} demandes
        </p>
      ) : null}
      {ledger && ledger.reviews.length > 0 ? (
        <section className="mt-8 grid gap-2">
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
    </div>
  );
}

function VendorTodoList({ items }: { items: VendorTodo[] }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-medium text-muted">
        À faire · <span className="font-medium text-accent">{items.length}</span>
      </h2>
      {items.length === 0 ? <p className="text-sm text-muted">Tout est à jour</p> : null}
      <ul className="grid gap-2">
        {items.map((item) => {
          const Icon = todoIcon(item.id);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex min-h-[4.25rem] items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-2.5 max-sm:min-h-[3.75rem] max-sm:gap-2.5 max-sm:px-3"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.warn ? "bg-danger-bg text-danger" : "bg-accent-soft text-accent"}`}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-medium leading-snug max-sm:text-[0.9375rem]">{item.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-ink/75">{item.subtitle}</span>
                </span>
                <ChevronRight className="h-[18px] w-[18px] shrink-0 text-ink/40" strokeWidth={1.75} aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function todoIcon(id: string): LucideIcon {
  if (id.startsWith("messages")) return MessageCircle;
  if (id.startsWith("quotes")) return FileText;
  if (id.startsWith("documents")) return Folder;
  if (id.startsWith("vault")) return Shield;
  return Clock;
}

function SignalCard({ icon: Icon, label, value, detail, balanced = false }: { icon: LucideIcon; label: string; value: string; detail: string; balanced?: boolean }) {
  return (
    <Card className="text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent text-accent">
        <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </span>
      <p className={`mt-4 text-sm font-medium leading-snug text-ink/80 ${balanced ? "flex min-h-[2.5em] items-end justify-center" : ""}`}>{label}</p>
      <p className="mt-2 font-serif text-[1.85rem] font-normal leading-none text-ink sm:text-4xl">{value}</p>
      <p className={`mt-2 text-[13px] leading-snug text-ink/75 ${balanced ? "min-h-[2.4em]" : ""}`}>{detail}</p>
    </Card>
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
    supabase.from("messages").select("id, author_id, body, created_at, vendor_user_id").eq("wedding_id", weddingId).order("created_at", { ascending: false }).limit(40),
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
  const readIds = await messageReadIds((notes ?? []).map((note) => note.id));
  const byThread = new Map<string, NonNullable<typeof notes>>();
  for (const note of notes ?? []) {
    const key = note.vendor_user_id ?? note.author_id;
    const list = byThread.get(key) ?? [];
    list.push(note);
    byThread.set(key, list);
  }
  const unread = [...byThread.values()].flatMap((list) => {
    const latest = list[0];
    if (!latest) return [];
    const vendorUserId = latest.vendor_user_id ?? latest.author_id;
    const open = readIds
      ? threadHasUnread(
          list.map((note) => ({ id: note.id, authorId: note.author_id, vendorUserId: note.vendor_user_id })),
          vendorUserId,
          userId,
          readIds,
        )
      : latest.author_id !== userId;
    return open ? [latest] : [];
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
  const [finance, quotes, deposits, reviews] = await Promise.all([
    loadVendorFinance(vendorId),
    supabase.from("quotes").select("id, status").eq("vendor_id", vendorId).eq("status", "sent"),
    supabase.from("deposits").select("id, status").eq("vendor_id", vendorId).in("status", ["pending", "reminded"]),
    supabase.from("reviews").select("id, rating, body, status").eq("vendor_id", vendorId).eq("status", "pending"),
  ]);
  return {
    finance,
    openQuotes: (quotes.data ?? []).length,
    pendingDeposits: (deposits.data ?? []).length,
    pendingReviews: (reviews.data ?? []).length,
    reviews: reviews.data ?? [],
  };
}
