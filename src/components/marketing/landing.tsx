"use client";

import { useState } from "react";
import Link from "next/link";
import { HeroPhoto } from "@/components/brand/hero-photo";
import { Archive, Briefcase, CalendarRange, FolderOpen, MessageCircle, PenLine, Share2, Sparkles, Users, WifiOff, type LucideIcon } from "lucide-react";

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
      <section className="relative flex min-h-[640px] items-end overflow-hidden bg-[#121110] text-[#f7f3ec] lg:min-h-[700px]">
        <HeroPhoto src="/hero/venue.jpg" position="center 62%" priority sizes="100vw" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-8 pt-24 md:pb-28 lg:pb-36 lg:pt-28">
          <h1 className="max-w-4xl font-serif text-6xl font-normal leading-[0.95] tracking-tight text-[#f7f3ec] sm:text-7xl lg:text-8xl">
            Le mariage, orchestré.
          </h1>
          <p className="mt-6 max-w-xl text-xl leading-8 text-[#f7f3ec]">L&apos;espace commun des prestataires et des mariés.</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/inscription?role=vendor" className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#1c1b19] px-7 text-base font-medium text-[#f7f3ec]">
              Je suis prestataire
            </Link>
            <Link href="/inscription?role=couple" className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#fbf8f3] px-7 text-base font-medium text-[#1c1b19]">
              Nous nous marions
            </Link>
          </div>
        </div>
      </section>
      <div className="relative z-10 mx-auto mt-6 grid max-w-6xl gap-4 px-5 md:-mt-28 md:px-6 lg:-mt-32">
        <HeroCard icon={CalendarRange} title="Jour J partagé" text="Le programme, visible par chaque métier." />
        <HeroCard icon={PenLine} title="Documents & signatures" text="Contrats et signatures au même endroit." />
        <HeroCard icon={MessageCircle} title="Messages" text="Un fil entre les mariés et chaque métier." />
      </div>
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
    </div>
  );
}

function HeroCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <article className="rounded-[28px] border border-line bg-paper px-6 py-8 text-center shadow-[var(--vow-shadow)]">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-accent text-accent">
        <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
      </span>
      <h2 className="mt-5 text-xl font-semibold tracking-tight text-ink">{title}</h2>
      <p className="mt-2 text-base leading-7 text-ink">{text}</p>
    </article>
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
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-accent">
              <item.icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-semibold tracking-tight">{item.title}</p>
              <p className="mt-1 text-base leading-7 text-ink">{item.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

