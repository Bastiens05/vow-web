"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function SpaceSwitcher({
  vendorHref,
  coupleHref,
}: {
  vendorHref: string | null;
  coupleHref: string | null;
}) {
  const path = usePathname() ?? "";

  useEffect(() => {
    if (path.startsWith("/mariage")) localStorage.setItem("vow-last-space", "couple");
    if (path === "/espace" || path.startsWith("/espace/") || path.startsWith("/demandes")) {
      localStorage.setItem("vow-last-space", "vendor");
    }
    if (!vendorHref || !coupleHref || path !== "/espace") return;
    if (sessionStorage.getItem("vow-routed")) return;
    if (new URLSearchParams(window.location.search).get("switch") === "1") {
      sessionStorage.setItem("vow-routed", "1");
      return;
    }
    if (localStorage.getItem("vow-last-space") === "couple") {
      sessionStorage.setItem("vow-routed", "1");
      window.location.assign(coupleHref);
    }
  }, [path, vendorHref, coupleHref]);

  if (!vendorHref || !coupleHref) return null;
  return (
    <div className="mb-4 flex gap-2 px-3">
      <Link href="/espace?switch=1" className="rounded-full bg-ink px-3 py-2 text-xs text-white">
        Prestataire
      </Link>
      <Link href={coupleHref} className="rounded-full border border-line px-3 py-2 text-xs">
        Mariés
      </Link>
    </div>
  );
}
