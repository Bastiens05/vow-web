import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { partitionWeddings, weddingStatus } from "@/lib/domain/access";
import { coupleFullNames, formatLongDate, todayIso, weddingTitle } from "@/lib/domain/format";
import { countdownLabel, daysUntil } from "@/lib/domain/next-actions";
import type { WeddingStep } from "@/lib/domain/vendor-home";
import type { WeddingCard } from "@/server/data";

export function WeddingDirectory({
  weddings,
  upcomingTitle = "À venir",
  steps,
}: {
  weddings: WeddingCard[];
  upcomingTitle?: string;
  steps?: Record<string, WeddingStep[]>;
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
      <WeddingGroup title={upcomingTitle} items={upcoming} today={today} empty="Aucun mariage à venir." steps={steps} />
      <WeddingGroup title="Passés" items={past} today={today} empty="Aucun mariage passé." steps={steps} />
    </div>
  );
}

function WeddingGroup({
  title,
  items,
  today,
  empty,
  steps,
}: {
  title: string;
  items: Array<WeddingCard & { weddingDate: string; isDemo: boolean }>;
  today: string;
  empty: string;
  steps?: Record<string, WeddingStep[]>;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted">{title}</h2>
      {items.length === 0 ? <p className="text-sm text-muted">{empty}</p> : null}
      <div className="grid gap-3">
        {items.map((wedding) => (
          <Card key={wedding.id} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:px-7 sm:py-6">
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
              {steps?.[wedding.id] ? <WeddingSteps steps={steps[wedding.id] ?? []} /> : null}
            </div>
            <ButtonLink href={`/mariage/${wedding.id}`} variant="secondary" className="w-full sm:mt-6 sm:w-auto">
              Ouvrir l&apos;espace
            </ButtonLink>
          </Card>
        ))}
      </div>
    </section>
  );
}

function WeddingSteps({ steps }: { steps: WeddingStep[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2" aria-label="Avancement">
      {steps.map((step) => (
        <span key={step.id} className={`flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${step.done ? "text-ink" : "text-muted"}`}>
          <span
            className={`flex h-[1.15rem] w-[1.15rem] items-center justify-center rounded-full border-[1.5px] border-accent ${step.done ? "bg-accent text-white" : "bg-transparent"}`}
          >
            {step.done ? <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden /> : null}
          </span>
          {step.label}
        </span>
      ))}
    </div>
  );
}
