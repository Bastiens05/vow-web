import Link from "next/link";
import { signOut } from "@/server/actions/auth";
import { getSession } from "@/server/session";

export async function SiteHeader() {
  const session = await getSession();
  const vendorSlug = session?.vendor?.slug;

  return (
    <header className="border-b border-line bg-ivory/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
        <Link href="/" className="font-serif text-3xl tracking-[0.18em] text-ink">
          VOW
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm">
          {session ? (
            <>
              <Link href="/espace" className="text-ink hover:text-gold-deep">
                Tableau de bord
              </Link>
              {session.profile.role === "vendor" ? (
                <Link href="/espace/profil" className="text-ink hover:text-gold-deep">
                  Ma vitrine
                </Link>
              ) : null}
              {vendorSlug && session.vendor?.published ? (
                <Link href={`/p/${vendorSlug}`} className="text-ink hover:text-gold-deep">
                  Page publique
                </Link>
              ) : null}
              <form action={signOut}>
                <button type="submit" className="text-muted hover:text-ink">
                  Se déconnecter
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/connexion" className="text-ink hover:text-gold-deep">
                Connexion
              </Link>
              <Link
                href="/inscription"
                className="rounded-full bg-ink px-3 py-1.5 text-ivory hover:bg-gold-deep"
              >
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
