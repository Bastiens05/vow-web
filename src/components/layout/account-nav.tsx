"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/reglages", label: "Profil" },
  { href: "/espace/profil", label: "Ma vitrine" },
  { href: "/abonnement", label: "Abonnement" },
] as const;

export function AccountNav({ admin = false }: { admin?: boolean }) {
  const path = usePathname() ?? "";
  const links = admin ? [...LINKS, { href: "/admin", label: "Admin" }] : [...LINKS];
  return (
    <nav aria-label="Réglages" className="mb-6 flex flex-wrap gap-2">
      {links.map((link) => {
        const active = path === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm transition ${
              active ? "bg-ink font-medium text-ivory" : "border border-line bg-paper text-ink hover:bg-ink/[0.04]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
