import { redirect } from "next/navigation";
import { categoryLabel } from "@/lib/domain/categories";
import { formatLongDate, weddingTitle } from "@/lib/domain/format";
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
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-12">
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
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-deep">
        {formatLongDate(space.wedding.wedding_date)}
      </p>
      <h1 className="mt-2 font-semibold tracking-tight text-4xl sm:text-5xl">{space.title}</h1>
      <p className="mt-2 text-sm text-muted">
        {[space.wedding.venue_name, space.wedding.venue_city].filter(Boolean).join(" · ") || "Lieu à préciser"}
      </p>
      {coupleView ? null : (
      <p className="mb-8 mt-3 text-sm font-medium">
        {vendor ? `Espace prestataire${space.session.vendor ? ` · ${categoryLabel(space.session.vendor.category)}` : ""}` : "Espace"}
      </p>
      )}
      {coupleView ? <div className="mb-8" /> : null}
      {children}
    </div>
  );
}
