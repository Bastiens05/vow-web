"use client";

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
}: {
  role: "vendor" | "couple" | null;
  category: VendorCategory | null;
  signedIn: boolean;
  variant: "side" | "tab";
}) {
  const path = usePathname() ?? "";
  const items = itemsFor(path, role, category, signedIn);
  const shown = variant === "tab" ? items.slice(0, 5) : items;
  return (
    <nav
      aria-label={role === "couple" ? "Espace mariés" : role === "vendor" ? "Espace prestataire" : "Navigation"}
      className={
        variant === "tab"
          ? "fixed inset-x-0 bottom-0 z-40 flex border-t border-black/10 bg-white px-1 pt-1 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
          : "mt-8 flex flex-1 flex-col gap-1"
      }
    >
      {shown.map((item) => (
        <NavLink key={item.href + item.label} {...item} active={isActive(path, item.href)} variant={variant} />
      ))}
    </nav>
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
): Item[] {
  const weddingId = weddingIdFrom(path);
  if (weddingId && signedIn && role) {
    const base = `/mariage/${weddingId}`;
    const sheet = pratiqueLabel(role, category);
    const items: Item[] = [
      { href: base, label: "Aperçu", icon: "home" },
      { href: `${base}/messages`, label: "Messages", icon: "message" },
      { href: `${base}/jour`, label: "Jour J", icon: "clock" },
      { href: `${base}/documents`, label: "Documents", icon: "file" },
    ];
    if (sheet) items.push({ href: `${base}/pratique`, label: sheet, icon: "people" });
    items.push({ href: `${base}/deroulement`, label: "Déroulé", icon: "spark" });
    if (role === "vendor") {
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
  if (role === "vendor") {
    return [
      { href: "/espace", label: "Mariages", icon: "home" },
      { href: "/espace/profil", label: "Vitrine", icon: "camera" },
      { href: "/compte", label: "Compte", icon: "user" },
    ];
  }
  return [
    { href: "/espace", label: "Mariage", icon: "home" },
    { href: "/compte", label: "Compte", icon: "user" },
  ];
}

function isActive(path: string, href: string) {
  if (href === "/espace" || href === "/") return path === href;
  if (/^\/mariage\/[^/]+$/.test(href)) return path === href;
  return path === href || path.startsWith(`${href}/`);
}
