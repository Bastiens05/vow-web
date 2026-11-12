"use client";

import { useState } from "react";
import Link from "next/link";
import { Archive, Briefcase, CalendarRange, FolderOpen, MessageCircle, Share2, Sparkles, Users, WifiOff, type LucideIcon } from "lucide-react";
import { PLAN_OFFERS, PLAN_SUMMARIES, featuresIncludedIn, type VendorPlan } from "@/lib/domain/plans";

type Audience = "couples" | "vendors";
type Feature = { title: string; text: string; icon: LucideIcon };

const couples: Feature[] = [
  {
    title: "Le déroulé du jour J",
    text: "Vous le composez, en versions beau temps et mauvais temps. Vos prestataires voient le leur.",
    icon: CalendarRange,
  },
  {
    title: "Un espace par prestataire",
    text: "Documents, contrats, paiement et messages, chacun de son côté.",
    icon: FolderOpen,
  },
  {
    title: "Coffre et budget",
    text: "Vos documents au même endroit, un budget prérempli depuis les devis.",
    icon: Archive,
  },
  {
    title: "Invités et souvenirs",
    text: "Page invités, réponses, plan de table et galerie.",
    icon: Users,
  },
  {
    title: "Un assistant pour vous aider",
    text: "Il propose un programme, dit ce qu'il reste à faire, rédige un message.",
    icon: Sparkles,
  },
];

const vendors: Feature[] = [
  {
    title: "Le déroulé partagé",
    text: "Le planning du couple, et chaque changement vous est transmis.",
    icon: Share2,
  },
  {
    title: "Votre espace métier",
    text: "Devis, factures, documents et questionnaire, pour votre métier.",
    icon: Briefcase,
  },
  {
    title: "Le jour J, même sans réseau",
    text: "Le relais entre les étapes et votre tableau de bord.",
    icon: WifiOff,
  },
  {
    title: "Un seul fil avec le couple",
    text: "Messages et données partagées, sans rien ressaisir.",
    icon: MessageCircle,
  },
  {
    title: "Un assistant pour vos mariages",
    text: "Résumé d'un mariage, réponse au couple, questionnaire par métier.",
    icon: Sparkles,
  },
];

export function Landing() {
  const [audience, setAudience] = useState<Audience>("couples");
  return (
    <div>
      <section className="bg-ivory text-ink">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div>
            <p className="text-xs font-semibold tracking-[0.28em] text-muted">VOW</p>
            <h1 className="mt-5 max-w-xl text-5xl font-semibold tracking-tight text-ink sm:text-6xl lg:text-7xl">
              Du premier contact au jour J.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
              Un seul espace pour les prestataires de mariage. La vitrine, le couple, le déroulé, et les outils que les
              agendas ne font pas.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/inscription?role=vendor"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-ivory"
              >
                Je suis prestataire
              </Link>
              <Link
                href="/inscription?role=couple"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/20 px-5 text-sm font-medium text-ink"
              >
                Nous nous marions
              </Link>
            </div>
            <Link href="/connexion" className="mt-6 inline-flex min-h-11 items-center text-sm text-muted">
              J&apos;ai déjà un compte
            </Link>
          </div>
          <RelayCard />
        </div>
      </section>
      <section id="ce-qui-compte" className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Ce qui compte, du premier contact au jour J.
        </h2>
        <div className="mt-8 flex rounded-full border border-line bg-paper p-1 text-sm lg:hidden" role="group" aria-label="À qui s'adresse VOW">
          <AudienceButton current={audience} value="couples" onSelect={setAudience}>
            Mariés
          </AudienceButton>
          <AudienceButton current={audience} value="vendors" onSelect={setAudience}>
            Prestataires
          </AudienceButton>
        </div>
        <div className="mt-8 grid gap-12 lg:mt-12 lg:grid-cols-2">
          <FeatureColumn title="Mariés" note="Gratuit" items={couples} hidden={audience !== "couples"} />
          <FeatureColumn title="Prestataires" items={vendors} hidden={audience !== "vendors"} />
        </div>
        <p className="mt-10 text-sm text-muted">Imaginé près de Bordeaux, pour tous les métiers du mariage.</p>
      </section>
      <Pricing />
    </div>
  );
}

function monthlyPrice(cents: number): string {
  const euros = Math.floor(cents / 100);
  const centsPart = cents % 100;
  if (centsPart === 0) return `${euros} €/mois`;
  return `${euros},${String(centsPart).padStart(2, "0")} €/mois`;
}

function Pricing() {
  return (
    <section id="tarifs" className="border-t border-line bg-ivory">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <p className="text-xs font-semibold tracking-[0.28em] text-muted">Prestataires</p>
        <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">Trois formules. Les mariés ne paient pas.</h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted">
          Studio comprend Pro, qui comprend Essentiel. Aucune commission. L&apos;espace des mariés reste gratuit.
        </p>
        <ul className="mt-10 grid gap-4 lg:grid-cols-3">
          {PLAN_OFFERS.map((plan) => (
            <PlanCard key={plan.id} id={plan.id} cents={plan.cents} />
          ))}
        </ul>
        <p className="mt-8 text-sm text-muted">
          Vous vous mariez ?{" "}
          <Link href="/inscription?role=couple" className="underline">
            L&apos;espace mariés est gratuit.
          </Link>
        </p>
      </div>
    </section>
  );
}

function PlanCard({ id, cents }: { id: VendorPlan; cents: number }) {
  const studio = id === "studio";
  const items = featuresIncludedIn(id);
  return (
    <li className={studio ? "flex flex-col rounded-[28px] bg-ink p-6 text-ivory lg:p-8" : "flex flex-col rounded-[28px] border border-line bg-paper p-6 lg:p-8"}>
      <p className={studio ? "text-sm text-ivory/70" : "text-sm text-muted"}>{PLAN_OFFERS.find((plan) => plan.id === id)?.label}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight">{monthlyPrice(cents)}</p>
      <p className={studio ? "mt-4 text-sm leading-6 text-ivory/80" : "mt-4 text-sm leading-6 text-muted"}>{PLAN_SUMMARIES[id]}</p>
      <ul className="mt-6 space-y-2 text-sm leading-6">
        {items.map((item) => (
          <li key={item.key}>{item.title}</li>
        ))}
      </ul>
      <Link
        href={`/inscription?role=vendor&plan=${id}`}
        className={
          studio
            ? "mt-auto inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ivory px-5 text-sm font-medium text-ink"
            : "mt-auto inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-ivory"
        }
      >
        Choisir {PLAN_OFFERS.find((plan) => plan.id === id)?.label}
      </Link>
    </li>
  );
}

function AudienceButton({
  current,
  value,
  onSelect,
  children,
}: {
  current: Audience;
  value: Audience;
  onSelect: (value: Audience) => void;
  children: string;
}) {
  const selected = current === value;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(value)}
      className={`min-h-11 flex-1 rounded-full px-4 ${selected ? "bg-ink font-medium text-ivory" : "text-muted"}`}
    >
      {children}
    </button>
  );
}

function FeatureColumn({
  title,
  note,
  items,
  hidden,
}: {
  title: string;
  note?: string;
  items: Feature[];
  hidden: boolean;
}) {
  return (
    <div className={hidden ? "hidden lg:block" : undefined}>
      <div className="flex items-baseline gap-3">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {note ? <p className="text-xs font-medium uppercase tracking-[0.16em] text-gold-deep">{note}</p> : null}
      </div>
      <ul className="mt-4 grid gap-3">
        {items.map((item) => (
          <li key={item.title} className="flex gap-4 rounded-3xl border border-line bg-paper px-4 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-ivory text-ink">
              <item.icon className="h-4 w-4" strokeWidth={1.6} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-semibold tracking-tight">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{item.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RelayCard() {
  return (
    <div className="rounded-[2rem] border border-line bg-mist p-6 text-ink">
      <p className="text-xs font-medium text-muted">Jour J · aperçu</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">Le relais avance.</p>
      <ol className="mt-6 space-y-3">
        <li className="flex items-center justify-between rounded-2xl bg-ivory px-4 py-3">
          <span>Préparatifs</span>
          <span className="text-xs font-medium">Prêt</span>
        </li>
        <li className="flex items-center justify-between rounded-2xl bg-ink px-4 py-3 text-ivory">
          <span>Cérémonie</span>
          <span className="text-xs">À vous</span>
        </li>
        <li className="flex items-center justify-between rounded-2xl bg-ivory px-4 py-3 text-muted">
          <span>Cocktail</span>
          <span className="text-xs">Ensuite</span>
        </li>
      </ol>
    </div>
  );
}
