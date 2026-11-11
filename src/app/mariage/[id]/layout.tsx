import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categoryLabel } from "@/lib/domain/categories";
import { formatLongDate, weddingTitle } from "@/lib/domain/format";
import { WeddingSwitcher } from "@/components/wedding/wedding-switcher";
import { deleteCoupleDemo, leaveCouplePreview } from "@/server/actions/account";
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
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-12">
      <div className="sticky top-14 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-2 border-b border-black/5 bg-ivory/95 px-4 py-3 backdrop-blur md:top-0 md:mx-0 md:rounded-2xl md:border md:px-3">
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
      {space.wedding.is_demo ? (
        <div className="mb-6 rounded-2xl border border-gold/40 bg-[#f8f1e4] px-4 py-4">
          <div className="mb-2">
            <Badge>Démo</Badge>
          </div>
          <p className="text-sm font-medium">
            {space.actingAsCouple ? "Vous testez l'espace mariés." : "Mariage d'essai, isolé de vos clients."}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Rien ici n&apos;est un vrai mariage. Le jour J d&apos;un client reste réservé au couple.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {space.actingAsCouple ? (
              <form action={leaveCouplePreview}>
                <input type="hidden" name="wedding_id" value={id} />
                <Button type="submit" variant="secondary">
                  Revenir en prestataire
                </Button>
              </form>
            ) : null}
            <form action={deleteCoupleDemo}>
              <Button type="submit" variant="danger">
                Supprimer la démo
              </Button>
            </form>
          </div>
        </div>
      ) : null}
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-deep">
        {formatLongDate(space.wedding.wedding_date)}
      </p>
      <h1 className="mt-2 font-semibold tracking-tight text-4xl sm:text-5xl">{space.title}</h1>
      <p className="mt-2 text-sm text-muted">
        {[space.wedding.venue_name, space.wedding.venue_city].filter(Boolean).join(" · ") || "Lieu à préciser"}
      </p>
      <p className="mb-8 mt-3 text-sm font-medium">
        {space.actingAsCouple
          ? "Espace mariés"
          : vendor
            ? `Espace prestataire${space.session.vendor ? ` · ${categoryLabel(space.session.vendor.category)}` : ""}`
            : "Espace mariés"}
      </p>
      {children}
    </div>
  );
}
