import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { partitionWeddings, weddingStatus } from "@/lib/domain/access";
import { coupleFullNames, formatLongDate, todayIso, weddingTitle } from "@/lib/domain/format";
import { countdownLabel, daysUntil } from "@/lib/domain/next-actions";
import type { WeddingCard } from "@/server/data";

export function WeddingDirectory({
  weddings,
  upcomingTitle = "À venir",
}: {
  weddings: WeddingCard[];
  upcomingTitle?: string;
}) {
  const today = todayIso();
  const dated = weddings.map((wedding) => ({
    ...wedding,
    weddingDate: wedding.wedding_date,
    isDemo: wedding.is_demo,
  }));
  const { upcoming, past } = partitionWeddings(dated, today);
  return (
    <div className="space-y-8">
      <WeddingGroup title={upcomingTitle} items={upcoming} today={today} empty="Aucun mariage à venir." />
      <WeddingGroup title="Passés" items={past} today={today} empty="Aucun mariage passé." />
    </div>
  );
}

function WeddingGroup({
  title,
  items,
  today,
  empty,
}: {
  title: string;
  items: Array<WeddingCard & { weddingDate: string; isDemo: boolean }>;
  today: string;
  empty: string;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted">{title}</h2>
      {items.length === 0 ? <p className="text-sm text-muted">{empty}</p> : null}
      <div className="grid gap-3">
        {items.map((wedding) => (
          <Card key={wedding.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink/80">
                {countdownLabel(daysUntil(wedding.wedding_date, today))} · {formatLongDate(wedding.wedding_date)}
              </p>
              <h3 className="mt-1 truncate text-2xl font-semibold tracking-tight">
                {weddingTitle(wedding.partner_one_name, wedding.partner_two_name)}
              </h3>
              {coupleFullNames(wedding.partner_one_name, wedding.partner_one_last_name, wedding.partner_two_name, wedding.partner_two_last_name) ? (
                <p className="mt-1 text-[13px] leading-snug text-ink/75">
                  {coupleFullNames(wedding.partner_one_name, wedding.partner_one_last_name, wedding.partner_two_name, wedding.partner_two_last_name)}
                </p>
              ) : null}
              <p className="mt-1 text-[13px] leading-snug text-ink/75">
                {[wedding.venue_name, wedding.venue_city].filter(Boolean).join(" · ") || "Lieu à préciser"}
              </p>
              <div className="mt-3">
                <Badge>
                  {weddingStatus({
                    weddingDate: wedding.wedding_date,
                    today,
                    isDemo: wedding.is_demo,
                    couplePreview: wedding.couple_preview,
                    coupleJoined: wedding.coupleJoined,
                  })}
                </Badge>
              </div>
            </div>
            <ButtonLink href={`/mariage/${wedding.id}`} variant="secondary">
              Ouvrir l&apos;espace
            </ButtonLink>
          </Card>
        ))}
      </div>
    </section>
  );
}
