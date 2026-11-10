"use client";

import { usePathname } from "next/navigation";
import { NavLink } from "@/components/ui/nav-link";

type Item = { href: string; label: string };

export function NavMenu({
  role,
  signedIn,
  variant,
}: {
  role: "vendor" | "couple" | null;
  signedIn: boolean;
  variant: "side" | "tab";
}) {
  const path = usePathname() ?? "";
  const items = itemsFor(path, role, signedIn);
  const shown = variant === "tab" ? items.slice(0, 5) : items;
  return (
    <nav className={variant === "tab" ? "fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" : "mt-8 flex flex-1 flex-col gap-1"}>
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

function itemsFor(path: string, role: "vendor" | "couple" | null, signedIn: boolean): Item[] {
  const weddingId = weddingIdFrom(path);
  if (weddingId && signedIn) {
    const base = `/mariage/${weddingId}`;
    const items: Item[] = [
      { href: base, label: "Aperçu" },
      { href: `${base}/messages`, label: "Messages" },
      { href: `${base}/jour`, label: "Jour J" },
      { href: `${base}/documents`, label: "Documents" },
      { href: `${base}/pratique`, label: "Pratique" },
      { href: `${base}/deroulement`, label: "Déroulé" },
    ];
    if (role === "vendor") items.push({ href: `${base}/inviter`, label: "Invitations" });
    return items;
  }
  if (!signedIn) {
    return [
      { href: "/", label: "Accueil" },
      { href: "/connexion", label: "Connexion" },
      { href: "/inscription", label: "Compte" },
    ];
  }
  const items: Item[] = [{ href: "/espace", label: "Accueil" }];
  if (role === "vendor") items.push({ href: "/espace/profil", label: "Vitrine" });
  items.push({ href: "/compte", label: "Compte" });
  return items;
}

function isActive(path: string, href: string) {
  if (href === "/espace" || href === "/") return path === href;
  if (/^\/mariage\/[^/]+$/.test(href)) return path === href;
  return path === href || path.startsWith(`${href}/`);
}
