import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { HeroPhoto } from "@/components/brand/hero-photo";
import { RealtimeRefresh } from "@/components/live/realtime-refresh";
import { AddVendorInvite } from "@/components/wedding/invite-block";
import { MessageThread } from "@/components/wedding/message-thread";
import { categoryLabel, isVendorCategory } from "@/lib/domain/categories";
import { daysUntil, heroCountdown } from "@/lib/domain/next-actions";
import { todayIso } from "@/lib/domain/format";
import { publicObjectUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace, listMessages } from "@/server/data";

export const metadata: Metadata = { title: "Messages" };

type Thread = {
  userId: string;
  name: string;
  role: string;
  avatar: string | null;
  excerpt: string;
  time: string;
  unread: boolean;
};

export default async function MessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ avec?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const space = await getWeddingSpace(id);
  const couple = space.role === "couple" || space.actingAsCouple;
  const supabase = await createClient();
  const { data: directory } = await supabase.rpc("wedding_directory", { p_wedding_id: id });
  const vendors = (directory ?? []).filter((person) => person.member_role === "vendor");
  const { data: recent } = await supabase
    .from("messages")
    .select("body, created_at, author_id, vendor_user_id")
    .eq("wedding_id", id)
    .order("created_at", { ascending: false })
    .limit(80);
  const latest = new Map<string, { body: string; createdAt: string; authorId: string }>();
  for (const row of recent ?? []) {
    const key = row.vendor_user_id;
    if (!key || latest.has(key)) continue;
    latest.set(key, { body: row.body, createdAt: row.created_at, authorId: row.author_id });
  }
  const { data: logos } = vendors.length
    ? await supabase.from("vendor_profiles").select("user_id, logo_path").in("user_id", vendors.map((person) => person.user_id))
    : { data: [] as { user_id: string; logo_path: string | null }[] };
  const avatarOf = new Map(
    (logos ?? []).map((row) => [row.user_id, row.logo_path ? publicObjectUrl("vendor-media", row.logo_path) : null]),
  );
  const threads: Thread[] = couple
    ? vendors.map((person) => {
        const trade = person.category && isVendorCategory(person.category) ? categoryLabel(person.category) : "Prestataire";
        const last = latest.get(person.user_id);
        return {
          userId: person.user_id,
          name: person.business_name || person.full_name || trade,
          role: trade,
          avatar: avatarOf.get(person.user_id) ?? null,
          excerpt: last ? excerptOf(last.body) : "",
          time: last ? threadTime(last.createdAt) : "",
          unread: Boolean(last && last.authorId !== space.session.userId),
        };
      })
    : [
        {
          userId: space.session.userId,
          name: space.title,
          role: "Mariés",
          avatar: null,
          excerpt: latest.get(space.session.userId) ? excerptOf(latest.get(space.session.userId)!.body) : "",
          time: latest.get(space.session.userId) ? threadTime(latest.get(space.session.userId)!.createdAt) : "",
          unread: Boolean(latest.get(space.session.userId) && latest.get(space.session.userId)!.authorId !== space.session.userId),
        },
      ];
  const requested = couple ? query.avec ?? "" : query.avec ?? space.session.userId;
  const fallbackId =
    (recent ?? []).find((row) => row.vendor_user_id && threads.some((thread) => thread.userId === row.vendor_user_id))?.vendor_user_id ??
    threads[0]?.userId ??
    "";
  const active = threads.find((thread) => thread.userId === requested) ?? threads.find((thread) => thread.userId === fallbackId) ?? null;
  const mobileOpen = Boolean(query.avec && active && active.userId === query.avec) || (!couple && Boolean(query.avec));
  const messages = active ? await listMessages(id, space.session.userId, couple ? active.userId : space.session.userId) : [];
  const figure = heroCountdown(daysUntil(space.wedding.wedding_date, todayIso())).figure;
  const avatars: Record<string, string | null> = {};
  for (const [userId, url] of avatarOf) avatars[userId] = url;

  return (
    <div className="overflow-hidden rounded-[28px] border border-line bg-paper md:grid md:h-[calc(100dvh-7rem)] md:grid-cols-[300px_minmax(0,1fr)]">
      <RealtimeRefresh channel={`messages-picker-${id}`} subscriptions={[{ table: "messages", event: "INSERT", filter: `wedding_id=eq.${id}` }]} />
      <aside className={`${mobileOpen ? "hidden md:flex" : "flex"} min-h-[70dvh] flex-col border-line md:min-h-0 md:border-r`}>
        <div className="px-5 pb-3 pt-5">
          <h2 className="text-3xl font-semibold tracking-tight text-ink">Messages</h2>
          <p className="mt-1 text-sm leading-6 text-ink">Échanges avec vos prestataires et partenaires</p>
        </div>
        {threads.length === 0 ? (
          <div className="px-5 pb-5">
            <p className="text-sm text-ink">Aucun prestataire pour l&apos;instant.</p>
            <AddVendorInvite weddingId={id} />
          </div>
        ) : (
          <ul className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
            {threads.map((thread) => {
              const selected = active?.userId === thread.userId;
              return (
                <li key={thread.userId}>
                  <Link
                    href={`/mariage/${id}/messages?avec=${thread.userId}`}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${selected ? "bg-accent-soft" : ""}`}
                  >
                    <RoundAvatar name={thread.name} src={thread.avatar} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-base font-medium text-ink">{thread.name}</span>
                        {thread.time ? <span className="shrink-0 text-xs text-ink/70">{thread.time}</span> : null}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="truncate text-sm text-ink/80">{thread.excerpt || thread.role}</span>
                        {thread.unread ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-label="Non lu" /> : null}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
      <section className={`${mobileOpen ? "flex" : "hidden md:flex"} relative min-h-[70dvh] flex-col overflow-hidden md:min-h-0`}>
        <HeroPhoto src="/hero/venue-golden.jpg" position="center 72%" sizes="70vw" veil="chat" soft />
        {active ? (
          <>
            <div className="relative z-10 flex items-center gap-3 border-b border-white/50 bg-white/40 px-4 py-3 backdrop-blur-md">
              <Link href={`/mariage/${id}/messages`} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-ink md:hidden" aria-label="Retour">
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </Link>
              <RoundAvatar name={active.name} src={active.avatar} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-medium text-ink">{active.name}</p>
                <p className="text-sm text-ink">{active.role}</p>
              </div>
              <span className="rounded-full border border-accent bg-white/75 px-3 py-1 font-serif text-lg text-ink">{figure}</span>
            </div>
            <MessageThread weddingId={id} vendorUserId={couple ? active.userId : space.session.userId} messages={messages} avatars={avatars} />
          </>
        ) : (
          <p className="relative z-10 m-auto max-w-xs px-6 text-center text-base text-ink">Choisissez une conversation.</p>
        )}
      </section>
    </div>
  );
}

function RoundAvatar({ name, src }: { name: string; src: string | null }) {
  if (src) return <img src={src} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />;
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-base font-medium text-ink">
      {initials(name)}
    </span>
  );
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "V";
}

function excerptOf(body: string) {
  const clean = body.replace(/\s+/g, " ").trim();
  if (clean.length <= 22) return clean;
  return `${clean.slice(0, 22).trimEnd()}…`;
}

function threadTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
