import { Card } from "@/components/ui/card";
import { BookForm } from "@/components/booking/book-form";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function PublicBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ jour?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(query.jour ?? "") ? query.jour! : new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  const { data: vendor } = await supabase.from("vendor_profiles").select("business_name, published").eq("slug", slug).maybeSingle();
  if (!vendor?.published) notFound();
  const { data: slots } = await supabase.rpc("open_slots", { p_slug: slug, p_day: day });
  return (
    <div className="mx-auto w-full max-w-md px-5 py-12">
      <p className="text-sm font-semibold tracking-[0.28em]">VOW</p>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">{vendor.business_name}</h1>
      <p className="mt-2 text-base text-muted">Choisissez un créneau. La confirmation arrive dans l&apos;application et par e-mail.</p>
      <form className="mt-6" method="get">
        <label className="grid gap-2 text-sm">
          Jour
          <input type="date" name="jour" defaultValue={day} className="min-h-11 rounded-xl border border-line bg-white px-3" />
        </label>
        <button className="mt-3 min-h-11 text-sm underline" type="submit">
          Voir les créneaux
        </button>
      </form>
      <Card className="mt-6">
        <BookForm slug={slug} slots={slots ?? []} />
      </Card>
    </div>
  );
}
