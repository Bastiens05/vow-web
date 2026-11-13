import { redirect } from "next/navigation";
import { WeddingChrome } from "@/components/wedding/wedding-chrome";
import { categoryLabel } from "@/lib/domain/categories";
import { coupleFullNames, formatLongDate, todayIso, weddingTitle } from "@/lib/domain/format";
import { daysUntil, heroCountdown } from "@/lib/domain/next-actions";
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
  const venue = [space.wedding.venue_name, space.wedding.venue_city].filter(Boolean).join(" · ") || "Lieu à préciser";
  const place = space.wedding.venue_name.trim() || space.wedding.venue_city.trim() || "Lieu à préciser";
  const roleLine = coupleView
    ? "Espace mariés"
    : vendor
      ? `Espace prestataire${space.session.vendor ? ` · ${categoryLabel(space.session.vendor.category)}` : ""}`
      : "Espace";
  const figure = heroCountdown(daysUntil(space.wedding.wedding_date, todayIso())).figure;
  return (
    <WeddingChrome
      id={id}
      coupleView={coupleView}
      weddings={weddings.map((wedding) => ({
        id: wedding.id,
        title: weddingTitle(wedding.partner_one_name, wedding.partner_two_name),
        date: wedding.wedding_date,
        isDemo: wedding.is_demo,
      }))}
      title={space.title}
      dateLabel={formatLongDate(space.wedding.wedding_date)}
      place={place}
      venue={venue}
      fullNames={fullNames}
      roleLine={roleLine}
      figure={figure}
    >
      {children}
    </WeddingChrome>
  );
}
