"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, MessageCircle } from "lucide-react";
import { HeroPhoto } from "@/components/brand/hero-photo";
import { RealtimeRefresh } from "@/components/live/realtime-refresh";
import { WeddingSwitcher } from "@/components/wedding/wedding-switcher";
import { weddingHeaderMode, weddingHomeLink } from "@/lib/domain/wedding-header";

export function WeddingChrome({
  id,
  coupleView,
  weddings,
  title,
  dateLabel,
  place,
  venue,
  fullNames,
  roleLine,
  figure,
  children,
}: {
  id: string;
  coupleView: boolean;
  weddings: { id: string; title: string; date: string; isDemo: boolean }[];
  title: string;
  dateLabel: string;
  place: string;
  venue: string;
  fullNames: string;
  roleLine: string;
  figure: string;
  children: ReactNode;
}) {
  const path = usePathname() ?? "";
  const mode = weddingHeaderMode(path, id);
  const home = weddingHomeLink(path, id);
  const homeLink = home ? (
    <Link
      href={home}
      className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium transition hover:bg-ink/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98]"
    >
      ‹ Retour au mariage
    </Link>
  ) : null;
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${mode === "hero" ? "pb-8 pt-0 sm:pb-12" : mode === "thread" ? "py-3 sm:py-4" : "py-8 sm:py-12"}`}>
      <RealtimeRefresh
        channel={`wedding-link-${id}`}
        subscriptions={[
          { table: "wedding_members", event: "INSERT", filter: `wedding_id=eq.${id}` },
          { table: "invitations", event: "*", filter: `wedding_id=eq.${id}` },
        ]}
      />
      {coupleView ? (
        homeLink ? (
          <div className="sticky top-14 z-20 -mx-4 mb-4 border-b border-line bg-paper/80 px-2 py-1 backdrop-blur md:top-0 md:mx-0 md:rounded-2xl md:border md:px-1">
            {homeLink}
          </div>
        ) : null
      ) : (
        <div className="sticky top-14 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-2 border-b border-line bg-paper/80 px-2 py-2 backdrop-blur md:top-0 md:mx-0 md:min-h-16 md:flex-nowrap md:rounded-2xl md:border md:py-0 md:pl-1 md:pr-40">
          {homeLink}
          <WeddingSwitcher currentId={id} weddings={weddings} />
          <p className="min-w-0 flex-1 truncate text-sm text-muted">{title}</p>
        </div>
      )}
      {mode === "hero" ? (
        <section className="relative -mx-4 mb-2 flex min-h-[62vh] items-center justify-center overflow-hidden bg-[#121110] px-6 py-10 text-center text-[#f7f3ec] sm:-mx-6 sm:min-h-[78vh] sm:py-20">
          <HeroPhoto src="/hero/venue-golden.jpg" position="center 70%" positionFromMd="center 76%" priority sizes="(min-width: 768px) 80vw, 100vw" zoom />
          <div className="relative z-10">
            <h1 className="font-serif text-6xl font-normal leading-none tracking-tight text-[#f7f3ec] max-[430px]:text-5xl sm:text-8xl">{title}</h1>
            <p className="mt-5 text-[18px] font-medium text-white max-[430px]:mt-3" style={{ textShadow: "0 1px 10px rgba(18,17,16,0.55)" }}>
              {dateLabel} · {place}
            </p>
            <p className="mt-8 font-serif text-8xl font-normal leading-none tracking-tight text-[#f7f3ec] max-[430px]:mt-4 max-[430px]:text-7xl sm:text-9xl">{figure}</p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 max-[430px]:mt-6 max-[430px]:w-full max-[430px]:flex-nowrap max-[430px]:gap-2">
              <Link href={`/mariage/${id}/jour`} className="inline-flex min-h-14 items-center gap-2 whitespace-nowrap rounded-full bg-[#1c1b19] px-7 text-base font-medium text-[#f7f3ec] max-[430px]:min-h-11 max-[430px]:gap-1 max-[430px]:px-3 max-[430px]:text-[13px]">
                Ouvrir le Jour J
                <ChevronRight className="h-5 w-5 max-[430px]:h-4 max-[430px]:w-4" aria-hidden />
              </Link>
              <Link href={`/mariage/${id}/messages`} className="inline-flex min-h-14 items-center gap-2 whitespace-nowrap rounded-full bg-[#fbf8f3] px-7 text-base font-medium text-[#1c1b19] max-[430px]:min-h-11 max-[430px]:gap-1 max-[430px]:px-3 max-[430px]:text-[13px]">
                <MessageCircle className="h-5 w-5 max-[430px]:h-4 max-[430px]:w-4" aria-hidden />
                Messages
              </Link>
            </div>
          </div>
        </section>
      ) : mode === "thread" ? null : (
        <header className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-accent">{dateLabel}</p>
          <h1 className="mt-2 text-5xl tracking-tight text-ink sm:text-6xl">{title}</h1>
          {fullNames ? <p className="mt-2 text-sm text-muted">{fullNames}</p> : null}
          <p className="mt-2 text-sm text-muted">{venue}</p>
          {roleLine ? <p className="mt-3 text-sm font-medium">{roleLine}</p> : null}
        </header>
      )}
      {children}
    </div>
  );
}
