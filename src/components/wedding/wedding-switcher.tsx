"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatLongDate } from "@/lib/domain/format";

export function WeddingSwitcher({
  currentId,
  weddings,
}: {
  currentId: string;
  weddings: Array<{ id: string; title: string; date: string; isDemo: boolean }>;
}) {
  const path = usePathname() ?? "";
  const rest = path.startsWith(`/mariage/${currentId}`) ? path.slice(`/mariage/${currentId}`.length) : "";
  const others = weddings.filter((wedding) => wedding.id !== currentId);
  return (
    <details className="relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-full border border-line bg-paper px-4 text-sm font-medium text-ink">
        Changer de mariage
      </summary>
      <div className="absolute left-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-paper p-2 text-ink shadow-[var(--vow-shadow)]">
        {others.length === 0 ? <p className="px-3 py-2 text-sm text-muted">Vous n&apos;avez qu&apos;un mariage.</p> : null}
        <ul>
          {others.map((wedding) => (
            <li key={wedding.id}>
              <Link href={`/mariage/${wedding.id}${rest}`} className="block rounded-xl px-3 py-3 hover:bg-ink/[0.06]">
                <span className="block font-medium">{wedding.title}</span>
                <span className="text-xs text-muted">
                  {formatLongDate(wedding.date)}
                  {wedding.isDemo ? " · Démo" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/mariages" className="block rounded-xl px-3 py-3 text-sm font-medium">
          Tous les mariages
        </Link>
        <Link href="/reglages" className="block rounded-xl px-3 py-3 text-sm text-muted">
          Réglages et déconnexion
        </Link>
      </div>
    </details>
  );
}
