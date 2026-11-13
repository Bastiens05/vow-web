"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { positiveBadgeCount } from "@/lib/domain/badge-count";

function CountBadge({ count }: { count: number }) {
  if (!Number.isInteger(count) || count < 1) return null;
  return (
    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium leading-none text-white">
      {count}
    </span>
  );
}

const vaultButtonClass =
  "relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-ink/[0.05] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function VaultLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className={vaultButtonClass}>
      <Lock className="h-5 w-5" strokeWidth={1.75} aria-hidden />
    </Link>
  );
}

export function VaultButton({ href, missing, children }: { href: string; missing: number; children: ReactNode }) {
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const apply = () => setMobile(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  const count = positiveBadgeCount(Number(missing));
  const label = count ? `Coffre, ${count} pièce${count > 1 ? "s" : ""} manquante${count > 1 ? "s" : ""}` : "Coffre";
  const icon = (
    <>
      <Lock className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      {count !== null && count > 0 ? <CountBadge count={count} /> : null}
    </>
  );
  const className = vaultButtonClass;
  if (!mobile) {
    return (
      <Link href={href} aria-label={label} className={className}>
        {icon}
      </Link>
    );
  }
  return (
    <>
      <button type="button" aria-label={label} aria-expanded={open} className={className} onClick={() => setOpen(true)}>
        {icon}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[60]">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Fermer le coffre" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl border border-line bg-ivory px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
