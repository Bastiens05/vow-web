import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { categoryLabel } from "@/lib/domain/categories";
import { coupleFullNames, formatLongDate, todayIso, weddingTitle } from "@/lib/domain/format";
import { daysUntil, heroCountdown } from "@/lib/domain/next-actions";
import { RealtimeRefresh } from "@/components/live/realtime-refresh";
import { CoverPhotoField } from "@/components/wedding/cover-photo-field";
import { WeddingStage } from "@/components/wedding/wedding-stage";
import { WeddingSwitcher } from "@/components/wedding/wedding-switcher";
import { ButtonLink } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signCovers } from "@/server/covers";
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
  const covers = overview ? await signCovers([{ id, cover_path: space.wedding.cover_path }]) : new Map<string, string>();
  const roleLine = coupleView
    ? null
    : vendor
      ? `Espace prestataire${space.session.vendor ? ` · ${categoryLabel(space.session.vendor.category)}` : ""}`
      : "Espace";
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
        <div className="-mx-4 mb-8 sm:-mx-6">
          <WeddingStage
            title={space.title}
            date={formatLongDate(space.wedding.wedding_date)}
            venue={venue}
            note={[roleLine, fullNames].filter(Boolean).join(" · ") || null}
            figure={heroCountdown(daysUntil(space.wedding.wedding_date, todayIso())).figure}
            imageUrl={covers.get(id) ?? null}
          >
            <ButtonLink href={`/mariage/${id}/messages`} variant="sharp">
              Messages
            </ButtonLink>
            <ButtonLink href={`/mariage/${id}/jour`} variant="sharpGhost">
              Jour J
            </ButtonLink>
            <CoverPhotoField weddingId={id} userId={session.userId} />
          </WeddingStage>
        </div>
      ) : (
        <header className="mb-8">
          <p className="font-display text-sm font-light text-accent">{formatLongDate(space.wedding.wedding_date)}</p>
          <h1 className="mt-2 font-display text-4xl font-light tracking-tight sm:text-5xl">{space.title}</h1>
          {fullNames ? <p className="mt-2 text-sm text-muted">{fullNames}</p> : null}
          <p className="mt-2 text-sm text-muted">{venue}</p>
          {roleLine ? <p className="mt-3 text-sm font-medium">{roleLine}</p> : null}
        </header>
      )}
      {children}
    </div>
  );
}
