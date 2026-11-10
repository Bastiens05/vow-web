import Link from "next/link";
import { NavMenu } from "@/components/layout/nav-menu";
import { signOut } from "@/server/actions/auth";
import { getSession } from "@/server/session";

export async function DesktopNav() {
  const session = await getSession();
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-ivory px-3 py-6 md:flex">
      <Link href={session ? "/espace" : "/"} className="px-3 text-lg font-semibold tracking-[0.22em]">
        VOW
      </Link>
      <NavMenu role={session?.profile.role ?? null} signedIn={Boolean(session)} variant="side" />
      {session ? (
        <form action={signOut}>
          <button type="submit" className="min-h-11 w-full rounded-xl px-3 text-left text-sm text-muted hover:text-ink">
            Se déconnecter
          </button>
        </form>
      ) : null}
    </aside>
  );
}

export async function MobileChrome() {
  const session = await getSession();
  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-ivory/90 px-4 backdrop-blur md:hidden">
        <Link href={session ? "/espace" : "/"} className="text-base font-semibold tracking-[0.22em]">
          VOW
        </Link>
        <span className="max-w-[50%] truncate text-sm text-muted">
          {session?.vendor?.business_name || session?.profile.full_name || ""}
        </span>
      </header>
      <NavMenu role={session?.profile.role ?? null} signedIn={Boolean(session)} variant="tab" />
    </>
  );
}
