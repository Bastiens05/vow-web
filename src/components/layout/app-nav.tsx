import Link from "next/link";
import { headers } from "next/headers";
import { NavMenu } from "@/components/layout/nav-menu";
import { SpaceSwitcher } from "@/components/layout/space-switcher";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { partitionWeddings } from "@/lib/domain/access";
import { todayIso } from "@/lib/domain/format";
import { getWeddingSpace, listMyWeddings } from "@/server/data";
import { getSession, type SessionProfile } from "@/server/session";

export async function DesktopNav() {
  const session = await getSession();
  const context = await navContext(session);
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-ivory px-3 py-6 md:flex">
      <Link href={session ? "/espace" : "/"} className="px-3 text-lg font-semibold tracking-[0.22em]">
        VOW
      </Link>
      <SpaceSwitcher vendorHref={context.vendorHref} coupleHref={context.coupleHref} />
      {context.inWedding ? (
        <Link
          href={session?.profile.role === "vendor" ? "/mariages" : "/espace"}
          className="mt-6 px-3 text-sm font-medium"
        >
          ← {session?.profile.role === "vendor" ? "Tous les mariages" : "Accueil"}
        </Link>
      ) : null}
      <NavMenu
        role={session?.profile.role ?? null}
        category={session?.vendor?.category ?? null}
        signedIn={Boolean(session)}
        variant="side"
        primaryWeddingId={context.primaryWeddingId}
        actingAsCouple={context.actingAsCouple}
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
      <header className="sticky top-0 z-30 grid h-14 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-black/10 bg-white/95 px-4 pr-28 backdrop-blur md:hidden">
        {context.inWedding ? (
          <Link
            href={session?.profile.role === "vendor" ? "/mariages" : "/espace"}
            className="shrink-0 text-sm font-medium"
          >
            ← {session?.profile.role === "vendor" ? "Mariages" : "Accueil"}
          </Link>
        ) : (
          <Link href={session ? "/espace" : "/"} className="shrink-0 text-base font-semibold tracking-[0.22em]">
            VOW
          </Link>
        )}
        <p className="truncate text-right text-sm text-muted">{context.inWedding || context.quiet ? "" : name}</p>
      </header>
      {context.quiet ? null : (
      <NavMenu
        role={session?.profile.role ?? null}
        category={session?.vendor?.category ?? null}
        signedIn={Boolean(session)}
        variant="tab"
        primaryWeddingId={context.primaryWeddingId}
        actingAsCouple={context.actingAsCouple}
      />
      )}
    </>
  );
}

async function navContext(session: SessionProfile | null) {
  const path = (await headers()).get("x-vow-path") ?? "";
  const quiet = /^\/(connexion|inscription|bienvenue|cgu|confidentialite)(\/|$)/.test(path);
  if (!session) return { primaryWeddingId: null, actingAsCouple: false, inWedding: false, quiet, vendorHref: null, coupleHref: null };
  const match = /^\/mariage\/([^/]+)/.exec(path);
  const weddings = await listMyWeddings(session.userId);
  const dated = weddings.map((wedding) => ({
    ...wedding,
    weddingDate: wedding.wedding_date,
    isDemo: wedding.is_demo,
  }));
  const { upcoming, past } = partitionWeddings(dated, todayIso());
  const primary = upcoming.find((wedding) => !wedding.isDemo) ?? upcoming[0] ?? past[0] ?? null;
  const coupleWedding = dated.find((wedding) => wedding.memberRole === "couple");
  let actingAsCouple = false;
  if (match) {
    const space = await getWeddingSpace(match[1]);
    actingAsCouple = space.actingAsCouple;
  }
  return {
    primaryWeddingId: primary?.id ?? null,
    actingAsCouple,
    inWedding: Boolean(match),
    quiet,
    vendorHref: session.profile.role === "vendor" ? "/espace" : null,
    coupleHref: coupleWedding ? `/mariage/${coupleWedding.id}` : null,
  };
}
