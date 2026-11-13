import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { headers } from "next/headers";
import { BackControl } from "@/components/layout/back-control";
import { CoupleSidebar } from "@/components/layout/couple-sidebar";
import { NavMenu } from "@/components/layout/nav-menu";
import { navigationItems } from "@/components/layout/navigation-items";
import { SpaceSwitcher } from "@/components/layout/space-switcher";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { partitionWeddings, preferredCoupleWedding } from "@/lib/domain/access";
import { backTarget, isPublicPath } from "@/lib/domain/chrome";
import { coupleHeroTitle, todayIso } from "@/lib/domain/format";
import { daysUntil, heroCountdown } from "@/lib/domain/next-actions";
import { getWeddingSpace, listMyWeddings } from "@/server/data";
import { getSession, type SessionProfile } from "@/server/session";
import { publicObjectUrl } from "@/lib/storage";

export async function DesktopNav() {
  const session = await getSession();
  const context = await navContext(session);
  const couple = session?.profile.role === "couple" || context.actingAsCouple;
  if (session && (couple || session.profile.role === "vendor")) {
    const countdown = context.weddingDate ? heroCountdown(daysUntil(context.weddingDate, todayIso())) : null;
    const figure = countdown && countdown.figure !== "—" ? countdown.figure : null;
    const inWedding = context.vendorInWedding && !couple;
    const studio = session.vendor?.business_name?.trim() || "";
    const logo = session.vendor?.logo_path ? publicObjectUrl("vendor-media", session.vendor.logo_path) : null;
    return (
      <CoupleSidebar
        items={couple ? context.coupleItems : context.sideItems}
        weddingName={couple ? context.weddingName : "Votre espace"}
        countdown={couple ? figure : null}
        userName={studio || session.profile.full_name || "Vous"}
        navLabel={couple ? "Espace mariés" : "Espace prestataire"}
        identityHref={couple ? undefined : "/espace"}
        identityLogo={couple ? null : logo}
        identityMark={couple ? undefined : studio || "Votre espace"}
        live={
          !couple && session.profile.role === "vendor"
            ? {
                role: "vendor",
                category: session.vendor?.category ?? null,
                primaryWeddingId: null,
                actingAsCouple: context.actingAsCouple,
                isAdmin: Boolean(session.isAdmin),
                weddingNames: context.weddingNames,
              }
            : null
        }
        section={
          inWedding
            ? {
                title: context.openedWeddingName || "Ce mariage",
                backHref: "/mariages",
                backLabel: "Retour à tous les mariages",
              }
            : null
        }
        groups={
          couple
            ? undefined
            : [
                {
                  caption: inWedding ? "" : "Espace",
                  labels: context.sideItems
                    .map((item) => item.label)
                    .filter((label) => !["Réglages", "Admin", "Aperçu"].includes(label)),
                },
              ]
        }
        extra={
          <SpaceSwitcher vendorHref={context.vendorHref} coupleHref={context.coupleHref} />
        }
        account={
          couple
            ? undefined
            : [
                { href: "/reglages", label: "Réglages", icon: "gear" },
                ...(session.isAdmin ? [{ href: "/admin", label: "Admin", icon: "gear" as const }] : []),
              ]
        }
      />
    );
  }
  return (
    <aside className="sticky top-0 hidden h-dvh w-[232px] flex-col border-r border-line bg-ivory px-3 py-6 md:flex">
      <Link href={session ? "/espace" : "/"} className="px-3" aria-label="VOW">
        <Logo />
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
      <header className="sticky top-0 z-30 grid h-14 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-line bg-[var(--vow-glass)] px-4 pr-36 backdrop-blur-md md:hidden">
        {context.back ? (
          <BackControl fallback={context.back.href} label={context.back.label} />
        ) : (
          <Link href={session ? "/espace" : "/"} className="shrink-0" aria-label="VOW">
            <Logo />
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

export function PublicHeader({ accounts = true }: { accounts?: boolean }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-[var(--vow-glass)] px-4 backdrop-blur-md">
      <Link href="/" aria-label="VOW">
        <Logo />
      </Link>
      <nav className="flex items-center gap-1 text-sm sm:gap-3">
        <Link href="/#ce-qui-compte" className="hidden min-h-11 items-center px-2 sm:inline-flex">
          Fonctionnalités
        </Link>
        <Link href="/#tarifs" className="hidden min-h-11 items-center px-2 sm:inline-flex">
          Tarifs
        </Link>
        {accounts ? (
          <>
            <Link href="/connexion" className="inline-flex min-h-11 items-center px-2 font-medium">
              Connexion
            </Link>
            <Link href="/inscription" className="inline-flex min-h-11 items-center rounded-2xl bg-ink px-3 text-ivory">
              Créer un compte
            </Link>
          </>
        ) : null}
      </nav>
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
      sideItems: [],
      vendorInWedding: false,
      weddingName: "Votre mariage",
      openedWeddingName: null as string | null,
      weddingNames: {} as Record<string, string>,
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
  const opened = match ? weddings.find((wedding) => wedding.id === match[1]) : null;
  const inWedding = Boolean(match) && session.profile.role === "vendor" && !actingAsCouple;
  const named = coupleWedding ?? opened;
    const focus = session.profile.role === "vendor" ? (primary ?? named) : named;
  const primaryWeddingId = session.profile.role === "couple" ? (coupleWedding?.id ?? null) : (primary?.id ?? null);
  return {
    primaryWeddingId,
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
    sideItems: navigationItems(
      path,
      session.profile.role,
      session.vendor?.category ?? null,
      true,
      primaryWeddingId,
      actingAsCouple,
      Boolean(session.isAdmin),
    ),
    vendorInWedding: inWedding,
    weddingName: focus ? coupleHeroTitle(focus.partner_one_name, focus.partner_two_name) : "Votre espace",
    openedWeddingName: opened ? coupleHeroTitle(opened.partner_one_name, opened.partner_two_name) : null,
    weddingNames: Object.fromEntries(weddings.map((wedding) => [wedding.id, coupleHeroTitle(wedding.partner_one_name, wedding.partner_two_name)])),
    weddingDate: focus?.wedding_date ?? null,
  };
}
