import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { partitionWeddings, weddingStatus } from "@/lib/domain/access";
import { coupleFullNames, formatLongDate, todayIso, weddingTitle } from "@/lib/domain/format";
import { daysUntil, heroCountdown } from "@/lib/domain/next-actions";
import { WeddingStage } from "@/components/wedding/wedding-stage";
import { signCovers } from "@/server/covers";
import type { WeddingCard } from "@/server/data";

export async function WeddingDirectory({ weddings }: { weddings: WeddingCard[] }) {
  const today = todayIso();
  const dated = weddings.map((wedding) => ({
    ...wedding,
    weddingDate: wedding.wedding_date,
    isDemo: wedding.is_demo,
  }));
  const { upcoming, past } = partitionWeddings(dated, today);
  const covers = await signCovers(weddings.map((wedding) => ({ id: wedding.id, cover_path: wedding.cover_path })));
  return (
    <div className="space-y-8">
      <WeddingGroup title="À venir" items={upcoming} today={today} empty="Aucun mariage à venir." covers={covers} />
      <WeddingGroup title="Passés" items={past} today={today} empty="Aucun mariage passé." covers={covers} />
    </div>
  );
}

function WeddingGroup({
  title,
  items,
  today,
  empty,
  covers,
}: {
  title: string;
  items: Array<WeddingCard & { weddingDate: string; isDemo: boolean }>;
  today: string;
  empty: string;
  covers: Map<string, string>;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted">{title}</h2>
      {items.length === 0 ? <p className="text-sm text-muted">{empty}</p> : null}
      <div className="grid gap-4">
        {items.map((wedding) => {
          const names = coupleFullNames(
            wedding.partner_one_name,
            wedding.partner_one_last_name,
            wedding.partner_two_name,
            wedding.partner_two_last_name,
          );
          return (
            <div key={wedding.id} className="relative">
              <div className="absolute left-4 top-4 z-10">
                <Badge tone="photo">
                  {weddingStatus({
                    weddingDate: wedding.wedding_date,
                    today,
                    isDemo: wedding.is_demo,
                    couplePreview: wedding.couple_preview,
                    coupleJoined: wedding.coupleJoined,
                  })}
                </Badge>
              </div>
              <WeddingStage
                compact
                title={weddingTitle(wedding.partner_one_name, wedding.partner_two_name)}
                date={formatLongDate(wedding.wedding_date)}
                venue={[wedding.venue_name, wedding.venue_city].filter(Boolean).join(" · ") || "Lieu à préciser"}
                figure={heroCountdown(daysUntil(wedding.wedding_date, today)).figure}
                imageUrl={covers.get(wedding.id) ?? null}
                note={names || null}
              >
                <ButtonLink href={`/mariage/${wedding.id}`} variant="sharp">
                  Ouvrir l&apos;espace
                </ButtonLink>
              </WeddingStage>
            </div>
          );
        })}
      </div>
    </section>
  );
}
