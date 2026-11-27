"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";

const AUTH = new Set(["/connexion", "/inscription", "/bienvenue", "/mot-de-passe", "/mot-de-passe-oublie"]);

export function PublicHeader() {
  const path = usePathname() ?? "";
  const home = path === "/";
  const pinned = AUTH.has(path);
  const accounts = !path.startsWith("/invitation/");
  const [onPhoto, setOnPhoto] = useState(true);

  useEffect(() => {
    if (!home) return;
    const update = () => {
      const hero = document.getElementById("vow-hero");
      if (!hero) return;
      setOnPhoto(hero.getBoundingClientRect().bottom > 64);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [home]);

  const overlay = home && onPhoto;
  const solidHome = home && !onPhoto;
  return (
    <header
      className={`z-30 flex items-center justify-between gap-2 px-4 sm:gap-3 sm:px-5 ${
        overlay
          ? "fixed inset-x-0 top-0 h-16 border-0 bg-transparent text-[#f7f3ec]"
          : solidHome
            ? "fixed inset-x-0 top-0 h-16 border-b border-line bg-paper text-ink"
            : pinned
              ? "auth-pinned-header fixed inset-x-0 top-0 border-b border-line bg-paper text-ink"
              : "sticky top-0 h-16 border-b border-line bg-[var(--vow-glass)] text-ink backdrop-blur-md"
      }`}
    >
      <Link href="/" aria-label="VOW" className="shrink-0">
        <Logo variant={overlay ? "white" : "ink"} />
      </Link>
      <nav className="flex items-center gap-1 text-base sm:gap-3">
        <Link href="/#ce-qui-compte" className="hidden min-h-12 items-center px-3 sm:inline-flex">
          Fonctionnalités
        </Link>
        <Link href="/#tarifs" className="hidden min-h-12 items-center px-3 sm:inline-flex">
          Tarifs
        </Link>
        {accounts ? (
          <>
            <Link href="/connexion" className="inline-flex min-h-12 items-center px-2 font-medium sm:px-3">
              Connexion
            </Link>
            <Link
              href="/inscription"
              className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 text-sm font-medium sm:min-h-12 sm:px-4 sm:text-base ${overlay ? "bg-[#f7f3ec] text-[#1c1b19]" : "bg-ink text-ivory"}`}
            >
              <span className="sm:hidden">Compte</span>
              <span className="hidden sm:inline">Créer un compte</span>
            </Link>
          </>
        ) : null}
      </nav>
    </header>
  );
}
