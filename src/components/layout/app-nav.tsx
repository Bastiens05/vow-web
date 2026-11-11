import Link from "next/link";
import { headers } from "next/headers";
import { BackControl } from "@/components/layout/back-control";
import { CoupleSidebar } from "@/components/layout/couple-sidebar";
import { NavMenu, navigationItems } from "@/components/layout/nav-menu";
import { SpaceSwitcher } from "@/components/layout/space-switcher";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { partitionWeddings, preferredCoupleWedding } from "@/lib/domain/access";
import { backTarget, isPublicPath } from "@/lib/domain/chrome";
import { coupleHeroTitle, todayIso } from "@/lib/domain/format";
import { daysUntil, heroCountdown } from "@/lib/domain/next-actions";
import { getWeddingSpace, listMyWeddings } from "@/server/data";
import { getSession, type SessionProfile } from "@/server/session";

export async function DesktopNav() {
  const session = await getSession();
  const context = await navContext(session);
  const couple = session?.profile.role === "couple" || context.actingAsCouple;
  if (couple && session) {
    const countdown = context.weddingDate ? heroCountdown(daysUntil(context.weddingDate, todayIso())) : null;
    return (
      <CoupleSidebar
        items={context.coupleItems}
        weddingName={context.weddingName}
        countdown={countdown && countdown.figure !== "—" ? countdown.figure : null}
        userName={session.profile.full_name || "Vous"}
      />
    );
  }
  return (
    <aside className="sticky top-0 hidden h-dvh w-[232px] flex-col border-r border-line bg-ivory px-3 py-6 md:flex">
      <Link href={session ? "/espace" : "/"} className="px-3 text-lg font-semibold tracking-[0.22em]">
        VOW
      </Link>
      <SpaceSwitcher vendorHref={context.vendorHref} coupleHref={context.coupleHref} />
      {context.back ? (
        <div className="mt-6 px-3">
          <BackControl fallback={context.back.href} label={context.back.label} />
        </div>
      ) : null}
      <NavMenu
        role={session?.profile.role ?? null}
        category={session?.vendor?.category ?? null}
        signedIn={Boolean(session)}
        variant="side"
        primaryWeddingId={context.primaryWeddingId}
        actingAsCouple={context.actingAsCouple}
        isAdmin={Boolean(session?.isAdmin)}
      />
      {session ? <SignOutButton /> : null}
    </aside>
  );
}

export async function MobileChrome() {
  const session = await getSession();
  const context = await navContext(session);
  const name = session?.vendor?.business_name || session?.profile.full_name || "";
  return (
    <>
      <header className="sticky top-0 z-30 grid h-14 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-line bg-paper/80 px-4 pr-36 backdrop-blur md:hidden">
        {context.back ? (
          <BackControl fallback={context.back.href} label={context.back.label} />
        ) : (
          <Link href={session ? "/espace" : "/"} className="shrink-0 text-base font-semibold tracking-[0.22em]">
            VOW
          </Link>
        )}
        <p className="truncate text-right text-sm text-muted">{context.back || context.quiet ? "" : name}</p>
      </header>
      {context.quiet ? null : (
      <NavMenu
        role={session?.profile.role ?? null}
        category={session?.vendor?.category ?? null}
        signedIn={Boolean(session)}
        variant="tab"
        primaryWeddingId={context.primaryWeddingId}
        actingAsCouple={context.actingAsCouple}
        isAdmin={Boolean(session?.isAdmin)}
      />
      )}
    </>
  );
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/80 px-4 backdrop-blur">
      <Link href="/" className="text-base font-semibold tracking-[0.22em]">
        VOW
      </Link>
      <Link href="/connexion" className="inline-flex min-h-11 items-center text-sm font-medium">
        Connexion
      </Link>
    </header>
  );
}

async function navContext(session: SessionProfile | null) {
  const path = (await headers()).get("x-vow-path") ?? "";
  const quiet = isPublicPath(path);
  if (!session) {
    return {
      primaryWeddingId: null,
      actingAsCouple: false,
      quiet,
      vendorHref: null,
      coupleHref: null,
      back: null,
      coupleItems: [],
      weddingName: "Votre mariage",
      weddingDate: null as string | null,
    };
  }
  const match = /^\/mariage\/([^/]+)/.exec(path);
  const weddings = await listMyWeddings(session.userId);
  const dated = weddings.map((wedding) => ({
    ...wedding,
    weddingDate: wedding.wedding_date,
    isDemo: wedding.is_demo,
  }));
  const { upcoming, past } = partitionWeddings(dated, todayIso());
  const primary = upcoming.find((wedding) => !wedding.isDemo) ?? upcoming[0] ?? past[0] ?? null;
  const coupleWedding = preferredCoupleWedding(dated, session.userId);
  let actingAsCouple = false;
  if (match) {
    const space = await getWeddingSpace(match[1]);
    actingAsCouple = space.actingAsCouple;
  }
  const coupleId = session.profile.role === "couple" ? (coupleWedding?.id ?? null) : actingAsCouple && match ? match[1] : null;
  const named = coupleWedding ?? (match ? weddings.find((wedding) => wedding.id === match[1]) : null);
  return {
    primaryWeddingId: session.profile.role === "couple" ? (coupleWedding?.id ?? null) : (primary?.id ?? null),
    actingAsCouple,
    quiet,
    vendorHref: session.profile.role === "vendor" ? "/espace" : null,
    coupleHref: coupleWedding ? `/mariage/${coupleWedding.id}` : null,
    back: backTarget(path, session.profile.role, actingAsCouple),
    coupleItems: navigationItems(
      path,
      session.profile.role,
      session.vendor?.category ?? null,
      true,
      coupleId ?? coupleWedding?.id ?? null,
      actingAsCouple || session.profile.role === "couple",
      Boolean(session.isAdmin),
    ),
    weddingName: named ? coupleHeroTitle(named.partner_one_name, named.partner_two_name) : "Votre mariage",
    weddingDate: named?.wedding_date ?? null,
  };
}
