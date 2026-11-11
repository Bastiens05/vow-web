import Link from "next/link";
import { Card } from "@/components/ui/card";
import { BookForm } from "@/components/booking/book-form";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace } from "@/server/data";

export default async function WeddingBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ jour?: string; slug?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const space = await getWeddingSpace(id);
  const supabase = await createClient();
  const vendorIds = space.members.filter((member) => member.role === "vendor").map((member) => member.userId);
  const { data: vendors } = vendorIds.length
    ? await supabase.from("vendor_profiles").select("slug, business_name, published, user_id").in("user_id", vendorIds)
    : { data: [] };
  const published = (vendors ?? []).filter((vendor) => vendor.published);
  const slug = query.slug && published.some((vendor) => vendor.slug === query.slug) ? query.slug : published[0]?.slug;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(query.jour ?? "") ? query.jour! : space.wedding.wedding_date;
  const { data: slots } = slug ? await supabase.rpc("open_slots", { p_slug: slug, p_day: day }) : { data: [] };
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-3xl font-semibold tracking-tight">Rendez-vous</h2>
        <p className="mt-1 text-sm text-muted">Les créneaux ouverts par le prestataire. La confirmation part par e-mail si l&apos;envoi est actif.</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {published.map((vendor) => (
            <li key={vendor.slug}>
              <Link className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm" href={`?slug=${vendor.slug}&jour=${day}`}>
                {vendor.business_name}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      {slug ? (
        <Card>
          <BookForm
            slug={slug}
            slots={slots ?? []}
            weddingId={id}
            defaultName={space.session.profile.full_name}
            defaultEmail={space.session.email ?? ""}
          />
        </Card>
      ) : (
        <p className="text-sm text-muted">Aucun prestataire publié sur ce mariage.</p>
      )}
    </div>
  );
}
