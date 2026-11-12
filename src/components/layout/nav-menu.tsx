"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { VendorCategory } from "@/lib/domain/categories";
import { LineIcon } from "@/components/ui/line-icon";
import { NavLink } from "@/components/ui/nav-link";
import { navigationItems, type NavItem } from "@/components/layout/navigation-items";

type Item = NavItem;

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
  const items = navigationItems(path, role, category, signedIn, primaryWeddingId, actingAsCouple, isAdmin);
  const inWedding = /^\/mariage\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\/|$)/i.test(path);
  const couple = role === "couple" || actingAsCouple;
  const mobileCouple = couple && variant === "tab";
  const mobileVendor = role === "vendor" && !actingAsCouple && variant === "tab";
  const tabOrder = mobileVendor
    ? inWedding
      ? ["Messages", "Jour J", "Documents"]
      : ["Accueil", "Mariages", "Messages"]
    : ["Accueil", "Jour J", "Messages", "Documents"];
  const usePlus = mobileCouple || mobileVendor;
  const primaryTabs = usePlus ? tabOrder.flatMap((label) => items.filter((item) => item.label === label)) : [];
  const moreTabs = usePlus ? items.filter((item) => !tabOrder.includes(item.label)) : [];
  const shown = usePlus
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
      {usePlus ? <MoreTab items={moreTabs} path={path} /> : null}
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
        className={`flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-xs font-medium transition active:scale-95 ${active || open ? "text-ink" : "text-muted"}`}
        onClick={() => setOpen(true)}
      >
        <LineIcon name="more" />
        <span className="text-xs leading-none">Plus</span>
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

function isActive(path: string, href: string) {
  if (href === "/espace" || href === "/" || href === "/mariages" || href === "/messages" || href === "/nouveautes" || href === "/alertes" || href === "/reglages" || href === "/demandes") {
    return path === href;
  }
  if (/^\/mariage\/[^/]+$/.test(href)) return path === href;
  return path === href || path.startsWith(`${href}/`);
}
