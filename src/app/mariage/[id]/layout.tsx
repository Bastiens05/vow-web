import Link from "next/link";
import { HeroPhoto } from "@/components/brand/hero-photo";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { categoryLabel } from "@/lib/domain/categories";
import { coupleFullNames, formatLongDate, todayIso, weddingTitle } from "@/lib/domain/format";
import { daysUntil, heroCountdown } from "@/lib/domain/next-actions";
import { RealtimeRefresh } from "@/components/live/realtime-refresh";
import { WeddingSwitcher } from "@/components/wedding/wedding-switcher";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace, listMyWeddings } from "@/server/data";
import { requireSession } from "@/server/session";

export default async function WeddingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const supabase = await createClient();
  const { data: member } = await supabase
    .from("wedding_members")
    .select("user_id")
    .eq("wedding_id", id)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (!member) {
    const { data: staff } = await supabase.rpc("is_wedding_staff", { p_wedding: id });
    if (!staff) redirect("/mariages");
  }
  const space = await getWeddingSpace(id);
  const weddings = await listMyWeddings(space.session.userId);
  const vendor = space.session.profile.role === "vendor";
  const coupleView = space.role === "couple" || space.actingAsCouple;
  const fullNames = coupleFullNames(
    space.wedding.partner_one_name,
    space.wedding.partner_one_last_name,
    space.wedding.partner_two_name,
    space.wedding.partner_two_last_name,
  );
  const path = (await headers()).get("x-vow-path") ?? "";
  const overview = path === `/mariage/${id}`;
  const venue = [space.wedding.venue_name, space.wedding.venue_city].filter(Boolean).join(" · ") || "Lieu à préciser";
  const roleLine = coupleView
    ? "Espace mariés"
    : vendor
      ? `Espace prestataire${space.session.vendor ? ` · ${categoryLabel(space.session.vendor.category)}` : ""}`
      : "Espace";
  const figure = heroCountdown(daysUntil(space.wedding.wedding_date, todayIso())).figure;
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${overview ? "pb-8 pt-0 sm:pb-12" : "py-8 sm:py-12"}`}>
      <RealtimeRefresh
        channel={`wedding-link-${id}`}
        subscriptions={[
          { table: "wedding_members", event: "INSERT", filter: `wedding_id=eq.${id}` },
          { table: "invitations", event: "*", filter: `wedding_id=eq.${id}` },
        ]}
      />
      {coupleView ? null : (
      <div className="sticky top-14 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-2 border-b border-line bg-paper/80 px-4 py-3 backdrop-blur md:top-0 md:mx-0 md:rounded-2xl md:border md:px-3">
        <WeddingSwitcher
          currentId={id}
          weddings={weddings.map((wedding) => ({
            id: wedding.id,
            title: weddingTitle(wedding.partner_one_name, wedding.partner_two_name),
            date: wedding.wedding_date,
            isDemo: wedding.is_demo,
          }))}
        />
        <p className="min-w-0 flex-1 truncate text-sm text-muted">{space.title}</p>
      </div>
      )}
      {overview ? (
        <section className="relative -mx-4 mb-2 flex min-h-[78vh] items-center justify-center overflow-hidden bg-[#121110] px-6 py-20 text-center text-[#f7f3ec] sm:-mx-6">
          <HeroPhoto src="/hero/venue.jpg" position="center 62%" priority sizes="(min-width: 768px) 80vw, 100vw" />
          <div className="relative z-10">
            <h1 className="font-serif text-6xl font-normal leading-none tracking-tight text-[#f7f3ec] sm:text-8xl">{space.title}</h1>
            <p className="mt-5 text-lg text-[#f7f3ec]">{formatLongDate(space.wedding.wedding_date)}</p>
            <p className="text-lg text-[#f7f3ec]">{venue}</p>
            {fullNames ? <p className="mt-2 text-base text-[#f7f3ec]">{fullNames}</p> : null}
            <p className="mt-8 font-serif text-8xl font-normal leading-none tracking-tight text-[#f7f3ec] sm:text-9xl">{figure}</p>
            {roleLine ? <p className="mt-5 text-base text-[#f7f3ec]">{roleLine}</p> : null}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href={`/mariage/${id}/jour`} className="inline-flex min-h-14 items-center rounded-full bg-[#1c1b19] px-7 text-base font-medium text-[#f7f3ec]">
                Ouvrir le Jour J
              </Link>
              <Link href={`/mariage/${id}/messages`} className="inline-flex min-h-14 items-center rounded-full bg-[#fbf8f3] px-7 text-base font-medium text-[#1c1b19]">
                Messages
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <header className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-accent">{formatLongDate(space.wedding.wedding_date)}</p>
          <h1 className="mt-2 text-5xl tracking-tight text-ink sm:text-6xl">{space.title}</h1>
          {fullNames ? <p className="mt-2 text-sm text-muted">{fullNames}</p> : null}
          <p className="mt-2 text-sm text-muted">{venue}</p>
          {roleLine ? <p className="mt-3 text-sm font-medium">{roleLine}</p> : null}
        </header>
      )}
      {children}
    </div>
  );
}
