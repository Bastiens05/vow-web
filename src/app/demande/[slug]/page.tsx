import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuoteForm } from "@/components/wedding/quote-form";
import { Card } from "@/components/ui/card";
import { categoryLabel } from "@/lib/domain/categories";
import { getPublicVendor } from "@/server/data";

export const metadata: Metadata = { title: "Demande de devis" };

export default async function QuotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicVendor(slug);
  if (!data?.vendor.published) notFound();
  return (
    <div className="mx-auto w-full max-w-lg px-5 py-10">
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-deep">{categoryLabel(data.vendor.category)}</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">{data.vendor.business_name}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Quelques lignes suffisent. La demande arrive directement dans VOW, sans créer de compte.
      </p>
      <Card className="relative mt-6">
        <QuoteForm slug={slug} />
      </Card>
      <p className="mt-6 text-sm">
        <Link href={`/p/${slug}`} className="underline">
          Voir la vitrine
        </Link>
      </p>
    </div>
  );
}
