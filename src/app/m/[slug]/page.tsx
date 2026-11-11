import Link from "next/link";
import { notFound } from "next/navigation";
import { formatLongDate, weddingTitle } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/server";

export default async function CoupleSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_site", { p_slug: slug });
  if (!data || typeof data !== "object" || Array.isArray(data)) notFound();
  const site = data as {
    one?: string;
    two?: string;
    date?: string;
    venue?: string;
    place?: string;
    programme?: string;
    note?: string;
    rsvp?: string | null;
  };
  if (!site.one || !site.two || !site.date) notFound();
  return (
    <div className="mx-auto w-full max-w-lg px-5 py-16">
      <p className="text-sm font-semibold tracking-[0.28em]">VOW</p>
      <p className="mt-8 text-sm text-gold-deep">{formatLongDate(site.date)}</p>
      <h1 className="mt-2 text-5xl font-semibold tracking-tight">{weddingTitle(site.one, site.two)}</h1>
      <p className="mt-3 text-base text-muted">{site.place || site.venue || "Le lieu sera précisé."}</p>
      {site.note ? <p className="mt-8 text-lg leading-8">{site.note}</p> : null}
      {site.programme ? <pre className="mt-8 whitespace-pre-wrap font-sans text-base leading-7">{site.programme}</pre> : null}
      {site.rsvp ? (
        <Link href={`/rsvp/${site.rsvp}`} className="mt-10 inline-flex min-h-12 items-center rounded-full bg-ink px-5 text-sm text-ivory">
          Répondre à l&apos;invitation
        </Link>
      ) : null}
    </div>
  );
}
