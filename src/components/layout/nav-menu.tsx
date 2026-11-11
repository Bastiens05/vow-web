"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { VendorCategory } from "@/lib/domain/categories";
import { pratiqueLabel } from "@/lib/domain/trades";
import { NavLink, type IconName } from "@/components/ui/nav-link";

type Item = { href: string; label: string; icon: IconName };

export function NavMenu({
  role,
  category,
  signedIn,
  variant,
  primaryWeddingId,
  actingAsCouple,
  isAdmin = false,
}: {
  role: "vendor" | "couple" | null;
  category: VendorCategory | null;
  signedIn: boolean;
  variant: "side" | "tab";
  primaryWeddingId: string | null;
  actingAsCouple: boolean;
  isAdmin?: boolean;
}) {
  const path = usePathname() ?? "";
  const items = itemsFor(path, role, category, signedIn, primaryWeddingId, actingAsCouple, isAdmin);
  const inWedding = Boolean(weddingIdFrom(path));
  const couple = role === "couple" || actingAsCouple;
  const mobileCouple = couple && variant === "tab";
  const tabOrder = ["Accueil", "Jour J", "Messages", "Documents"];
  const primaryTabs = mobileCouple
    ? tabOrder.flatMap((label) => items.filter((item) => item.label === label))
    : [];
  const moreTabs = mobileCouple
    ? items.filter((item) => !["Accueil", "Jour J", "Messages", "Documents"].includes(item.label))
    : [];
  const shown = mobileCouple
    ? primaryTabs
    : variant !== "tab"
      ? items
      : inWedding
        ? items.slice(0, 5)
        : items.filter((item) => item.label !== "Messages" && item.label !== "Abonnement" && item.label !== "Admin").slice(0, 5);
  const label = inWedding
    ? actingAsCouple || role === "couple"
      ? "Espace mariés"
      : "Espace prestataire"
    : role === "vendor"
      ? "Navigation générale"
      : role === "couple"
        ? "Espace mariés"
        : "Navigation";
  return (
    <nav
      aria-label={label}
      className={
        variant === "tab"
          ? "fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-line bg-paper/80 px-1 pt-1 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] backdrop-blur pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
          : "mt-8 flex flex-1 flex-col gap-1"
      }
    >
      {shown.map((item) => (
        <NavLink key={item.href + item.label} {...item} active={isActive(path, item.href)} variant={variant} />
      ))}
      {mobileCouple ? <MoreTab items={moreTabs} path={path} /> : null}
    </nav>
  );
}

function MoreTab({ items, path }: { items: Item[]; path: string }) {
  const [open, setOpen] = useState(false);
  const active = items.some((item) => isActive(path, item.href));
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[11px] font-medium transition active:scale-95 ${active || open ? "text-ink" : "text-muted"}`}
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="6" cy="12" r="1.2" fill="currentColor" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
          <circle cx="18" cy="12" r="1.2" fill="currentColor" />
        </svg>
        Plus
      </button>
      {open ? (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Fermer" onClick={() => setOpen(false)} />
          <div role="dialog" aria-label="Plus" className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-line bg-paper p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            <div onClick={() => setOpen(false)} className="grid gap-1">
              {items.map((item) => (
                <NavLink key={item.href + item.label} {...item} active={isActive(path, item.href)} variant="side" />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function weddingIdFrom(path: string) {
  const match = /^\/mariage\/([^/]+)/.exec(path);
  return match?.[1] ?? null;
}

function itemsFor(
  path: string,
  role: "vendor" | "couple" | null,
  category: VendorCategory | null,
  signedIn: boolean,
  primaryWeddingId: string | null,
  actingAsCouple: boolean,
  isAdmin: boolean,
): Item[] {
  const weddingId = primaryWeddingId;
  if ((role === "couple" || actingAsCouple) && signedIn) {
    const base = weddingId ? `/mariage/${weddingId}` : "";
    const items: Item[] = [
      { href: "/espace", label: "Accueil", icon: "home" },
      { href: base ? `${base}/jour` : "/espace", label: "Jour J", icon: "clock" },
      { href: base ? `${base}/messages` : "/messages", label: "Messages", icon: "message" },
      { href: base ? `${base}/bulles` : "/espace", label: "Documents", icon: "file" },
      { href: base ? `${base}/pratique` : "/espace", label: "Fiches", icon: "spark" },
      { href: base ? `${base}/equipe` : "/espace", label: "Prestataires", icon: "people" },
      { href: base ? `${base}/budget` : "/espace", label: "Budget", icon: "spark" },
      { href: base ? `${base}/coffre` : "/espace", label: "Coffre", icon: "file" },
      { href: "/reglages", label: "Réglages", icon: "gear" },
    ];
    if (isAdmin) items.push({ href: "/admin", label: "Admin", icon: "gear" });
    return items;
  }
  const currentWedding = weddingIdFrom(path);
  if (currentWedding && signedIn && role) {
    const view = actingAsCouple ? "couple" : role;
    const base = `/mariage/${currentWedding}`;
    const sheet = pratiqueLabel(view, actingAsCouple ? null : category);
    const items: Item[] = [
      { href: base, label: "Aperçu", icon: "home" },
      { href: `${base}/messages`, label: "Messages", icon: "message" },
      { href: `${base}/jour`, label: "Jour J", icon: "clock" },
      { href: `${base}/documents`, label: "Documents", icon: "file" },
    ];
    if (sheet) items.push({ href: `${base}/pratique`, label: sheet, icon: "people" });
    items.push({ href: `${base}/deroulement`, label: "Déroulé", icon: "spark" });
    if (view === "vendor") {
      items.push({ href: `${base}/bulles`, label: "Ma bulle", icon: "spark" });
      items.push({ href: `${base}/inviter`, label: "Invitations", icon: "user" });
    }
    return items;
  }
  if (!signedIn) {
    return [
      { href: "/", label: "Accueil", icon: "home" },
      { href: "/connexion", label: "Connexion", icon: "user" },
      { href: "/inscription", label: "Compte", icon: "spark" },
    ];
  }
  const items: Item[] =
    role === "vendor"
      ? [
          { href: "/espace", label: "Accueil", icon: "home" },
          { href: "/mariages", label: "Mariages", icon: "list" },
          { href: "/demandes", label: "Demandes", icon: "mail" },
          { href: "/messages", label: "Messages", icon: "message" },
          { href: "/alertes", label: "Alertes", icon: "bell" },
          { href: "/abonnement", label: "Abonnement", icon: "spark" },
          { href: "/reglages", label: "Réglages", icon: "gear" },
        ]
      : [
          { href: "/espace", label: "Accueil", icon: "home" },
          { href: primaryWeddingId ? `/mariage/${primaryWeddingId}` : "/mariages", label: "Mariage", icon: "list" },
          { href: "/alertes", label: "Alertes", icon: "bell" },
          { href: "/reglages", label: "Réglages", icon: "gear" },
        ];
  if (isAdmin) items.push({ href: "/admin", label: "Admin", icon: "gear" });
  return items;
}

function isActive(path: string, href: string) {
  if (href === "/espace" || href === "/" || href === "/mariages" || href === "/messages" || href === "/alertes" || href === "/reglages" || href === "/demandes") {
    return path === href;
  }
  if (/^\/mariage\/[^/]+$/.test(href)) return path === href;
  return path === href || path.startsWith(`${href}/`);
}
