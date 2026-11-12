import Link from "next/link";
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
    ? null
    : vendor
      ? `Espace prestataire${space.session.vendor ? ` · ${categoryLabel(space.session.vendor.category)}` : ""}`
      : "Espace";
  const figure = heroCountdown(daysUntil(space.wedding.wedding_date, todayIso())).figure;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-12">
      <RealtimeRefresh
        channel={`wedding-link-${id}`}
        subscriptions={[
          { table: "wedding_members", event: "INSERT", filter: `wedding_id=eq.${id}` },
          { table: "invitations", event: "*", filter: `wedding_id=eq.${id}` },
        ]}
      />
      {coupleView ? null : (
      <div className="sticky top-14 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-2 border-b border-line bg-[var(--vow-glass)] px-4 py-3 backdrop-blur-2xl md:top-0 md:mx-0 md:rounded-3xl md:border md:px-3">
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
        <section
          className="relative -mx-4 mb-8 flex min-h-[32rem] items-center justify-center overflow-hidden bg-[#1c1915] px-6 py-16 text-center text-[#f6f2ec] sm:-mx-6"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(28,25,21,0.78), rgba(28,25,21,0.34) 46%, rgba(28,25,21,0.2)), url(/hero/vignoble.jpg)",
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        >
          <div className="relative max-w-3xl">
            <h1 className="font-serif text-5xl font-medium tracking-tight text-[#f6f2ec] sm:text-7xl">{space.title}</h1>
            <p className="mt-4 text-base text-[#f6f2ec]/80">{formatLongDate(space.wedding.wedding_date)}</p>
            <p className="text-base text-[#f6f2ec]/80">{venue}</p>
            {fullNames ? <p className="mt-2 font-serif text-lg text-[#f6f2ec]/90">{fullNames}</p> : null}
            <p className="mt-6 font-sans text-7xl font-extralight leading-none tracking-tight text-[#f0d7a8] sm:text-8xl">{figure}</p>
            {roleLine ? <p className="mt-4 text-sm text-[#f6f2ec]/75">{roleLine}</p> : null}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href={`/mariage/${id}/jour`} className="inline-flex min-h-11 items-center rounded-none bg-[#1c1915] px-5 text-sm font-medium text-[#f6f2ec]">
                Le déroulé
              </Link>
              <Link
                href={`/mariage/${id}/messages`}
                className="inline-flex min-h-11 items-center rounded-none border border-white/45 bg-white/15 px-5 text-sm font-medium text-[#f6f2ec] backdrop-blur"
              >
                Échanger
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <header className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-accent">{formatLongDate(space.wedding.wedding_date)}</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">{space.title}</h1>
          {fullNames ? <p className="mt-2 text-sm text-muted">{fullNames}</p> : null}
          <p className="mt-2 text-sm text-muted">{venue}</p>
          {roleLine ? <p className="mt-3 text-sm font-medium">{roleLine}</p> : null}
        </header>
      )}
      {children}
    </div>
  );
}
