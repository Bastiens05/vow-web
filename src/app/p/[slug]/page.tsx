import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { categoryLabel } from "@/lib/domain/categories";
import { formatPriceCents } from "@/lib/domain/price";
import { publicObjectUrl } from "@/lib/storage";
import { getPublicVendor } from "@/server/data";
import { getSession } from "@/server/session";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicVendor(slug);
  if (!data) return { title: "Vitrine" };
  return { title: data.vendor.business_name, description: data.vendor.description.slice(0, 160) };
}

export default async function PublicVendorPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getPublicVendor(slug);
  if (!data) notFound();
  const session = await getSession();
  const isOwner = session?.userId === data.vendor.user_id;
  if (!data.vendor.published && !isOwner) notFound();

  const { vendor, offers, photos } = data;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {!vendor.published ? (
        <p className="mb-6 rounded-xl bg-[#f6f0e4] px-3 py-2 text-sm text-gold-deep">
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
                {offer.price_cents !== null ? (
                  <p className="mt-3 text-sm text-gold-deep">{formatPriceCents(offer.price_cents)}</p>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

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
