import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { categoryLabel } from "@/lib/domain/categories";
import { featureEnabled } from "@/lib/domain/plans";
import { publicCoupleName } from "@/lib/domain/references";
import { formatPriceCents } from "@/lib/domain/price";
import { visiblePrice } from "@/lib/domain/promo";
import { todayIso } from "@/lib/domain/format";
import { publicObjectUrl } from "@/lib/storage";
import { getPublicVendor } from "@/server/data";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/server/session";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicVendor(slug);
  if (!data) return { title: "Vitrine" };
  const description = data.vendor.description.slice(0, 160);
  return { title: data.vendor.business_name, description, openGraph: { title: data.vendor.business_name, description } };
}

export default async function PublicVendorPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getPublicVendor(slug);
  if (!data) notFound();
  const session = await getSession();
  const isOwner = session?.userId === data.vendor.user_id;
  if (!data.vendor.published && !isOwner) notFound();

  const { vendor, offers, photos } = data;
  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, body")
    .eq("vendor_id", vendor.id)
    .eq("status", "published");
  const proven = featureEnabled("references")
    ? (await supabase.from("proven_references").select("id, month, venue_name, town, review, couple_public_name").eq("vendor_id", vendor.id).eq("published", true)).data ?? []
    : [];
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {!vendor.published ? (
        <p className="mb-6 rounded-xl border border-line bg-paper px-3 py-2 text-sm">
          Cette vitrine n&apos;est pas publiée. Vous seul la voyez.
        </p>
      ) : null}
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-deep">{categoryLabel(vendor.category)}</p>
      <h1 className="mt-2 font-semibold tracking-tight text-5xl sm:text-6xl">{vendor.business_name}</h1>
      <p className="mt-3 text-sm text-muted">
        {vendor.city}
        {vendor.zone ? ` · ${vendor.zone}` : ""}
      </p>
      {vendor.starting_price_cents !== null ? (
        <p className="mt-4 text-sm">À partir de {formatPriceCents(vendor.starting_price_cents, vendor.currency)}</p>
      ) : null}
      {vendor.description ? (
        <p className="mt-8 max-w-2xl whitespace-pre-wrap text-base leading-7">{vendor.description}</p>
      ) : null}

      {photos.length > 0 ? (
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => {
            const src = publicObjectUrl("vendor-media", photo.storage_path);
            if (!src) return null;
            return (
              <div key={photo.id} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-paper">
                <Image src={src} alt={photo.caption || vendor.business_name} fill unoptimized className="object-cover" sizes="(min-width: 1024px) 33vw, 100vw" />
              </div>
            );
          })}
        </div>
      ) : null}

      {offers.length > 0 ? (
        <section className="mt-12">
          <h2 className="font-semibold tracking-tight text-4xl">Offres</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {offers.map((offer) => (
              <Card key={offer.id}>
                <h3 className="font-semibold tracking-tight text-2xl">{offer.title}</h3>
                {offer.description ? <p className="mt-2 text-sm leading-6 text-muted">{offer.description}</p> : null}
                {offer.price_cents !== null ? <OfferPrice offer={offer} /> : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {proven.length > 0 ? (
        <section className="mt-12">
          <h2 className="font-semibold tracking-tight text-4xl">Mariages vérifiés</h2>
          <div className="mt-4 grid gap-3">
            {proven.map((item) => (
              <Card key={item.id}>
                <p className="text-sm text-muted">{item.month} · {item.venue_name}{item.town ? `, ${item.town}` : ""}</p>
                <p className="mt-1 font-semibold">{publicCoupleName(item.couple_public_name)}</p>
                {item.review ? <p className="mt-2 text-sm leading-6">{item.review}</p> : null}
                <p className="mt-2 text-xs text-muted">Vérifié par VOW</p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {(reviews ?? []).length > 0 ? (
        <section className="mt-12">
          <h2 className="font-semibold tracking-tight text-4xl">Avis</h2>
          <div className="mt-4 grid gap-3">
            {(reviews ?? []).map((review) => (
              <Card key={review.id}>
                <p className="text-sm text-gold-deep">{review.rating}/5</p>
                {review.body ? <p className="mt-2 text-sm leading-6">{review.body}</p> : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}
      <div className="mt-10">
        <ButtonLink href={`/demande/${vendor.slug}`}>Demander un devis</ButtonLink>
      </div>
      <Card className="mt-12">
        <h2 className="font-semibold tracking-tight text-3xl">Contact</h2>
        <div className="mt-3 space-y-1 text-sm">
          {vendor.contact_email ? <p>{vendor.contact_email}</p> : null}
          {vendor.contact_phone ? <p>{vendor.contact_phone}</p> : null}
          {vendor.website ? (
            <p>
              <a href={vendor.website} className="underline" rel="noreferrer">
                {vendor.website}
              </a>
            </p>
          ) : null}
          {!vendor.contact_email && !vendor.contact_phone && !vendor.website ? (
            <p className="text-muted">Les coordonnées seront ajoutées par le prestataire.</p>
          ) : null}
        </div>
        <div className="mt-4">
          <Badge>{vendor.city || "France"}</Badge>
        </div>
      </Card>
    </div>
  );
}

function OfferPrice({
  offer,
}: {
  offer: {
    price_cents: number | null;
    promo_kind: "percent" | "amount" | null;
    promo_value: number | null;
    promo_label: string;
    promo_starts_on: string | null;
    promo_ends_on: string | null;
  };
}) {
  const price = visiblePrice(
    {
      priceCents: offer.price_cents,
      promoKind: offer.promo_kind,
      promoValue: offer.promo_value,
      promoLabel: offer.promo_label,
      promoStartsOn: offer.promo_starts_on,
      promoEndsOn: offer.promo_ends_on,
    },
    todayIso(),
  );
  if (price.currentCents === null) return null;
  return (
    <div className="mt-3">
      {price.originalCents !== null ? (
        <p className="text-sm text-muted line-through">{formatPriceCents(price.originalCents)}</p>
      ) : null}
      <p className="text-sm text-gold-deep">{formatPriceCents(price.currentCents)}</p>
      {price.badge ? <p className="mt-2 inline-flex rounded-full bg-ink px-3 py-1 text-xs text-ivory">{price.badge}</p> : null}
    </div>
  );
}
