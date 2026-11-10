import { formatLongDate } from "@/lib/domain/format";
import { getWeddingSpace } from "@/server/data";

export default async function WeddingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-deep">
        {formatLongDate(space.wedding.wedding_date)}
      </p>
      <h1 className="mt-2 font-semibold tracking-tight text-4xl sm:text-5xl">{space.title}</h1>
      <p className="mt-2 mb-8 text-sm text-muted">
        {[space.wedding.venue_name, space.wedding.venue_city].filter(Boolean).join(" · ") || "Lieu à préciser"}
      </p>
      {children}
    </div>
  );
}
