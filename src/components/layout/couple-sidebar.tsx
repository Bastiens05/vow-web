"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/server/actions/auth";
import { LineIcon } from "@/components/ui/line-icon";
import type { IconName } from "@/components/ui/nav-link";

type Item = { href: string; label: string; icon: IconName };

function readSidebarCollapsed() {
  return window.localStorage.getItem("vow-sidebar") === "icons";
}

function subscribeSidebar(onChange: () => void) {
  window.addEventListener("vow-sidebar", onChange);
  return () => window.removeEventListener("vow-sidebar", onChange);
}

const GROUPS: { caption: string; labels: string[] }[] = [
  { caption: "Mariage", labels: ["Accueil", "Jour J", "Messages", "Documents"] },
  { caption: "Organisation", labels: ["Fiches", "Prestataires", "Budget"] },
];

export function CoupleSidebar({
  items,
  weddingName,
  countdown,
  userName,
  groups = GROUPS,
  navLabel = "Espace mariés",
  extra = null,
  account,
}: {
  items: Item[];
  weddingName: string;
  countdown: string | null;
  userName: string;
  groups?: { caption: string; labels: string[] }[];
  navLabel?: string;
  extra?: ReactNode;
  account?: Item[];
}) {
  const path = usePathname() ?? "";
  const collapsed = useSyncExternalStore(subscribeSidebar, readSidebarCollapsed, () => false);
  function toggle() {
    window.localStorage.setItem("vow-sidebar", collapsed ? "full" : "icons");
    window.dispatchEvent(new Event("vow-sidebar"));
  }
  const settings = items.find((item) => item.label === "Réglages");
  const admin = items.find((item) => item.label === "Admin");
  return (
    <aside
      className={`sticky top-3 z-20 my-3 ml-3 hidden h-[calc(100dvh-1.5rem)] flex-col rounded-3xl border border-line bg-paper/70 shadow-[0_12px_40px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-[width] duration-200 md:flex ${collapsed ? "w-[4.75rem]" : "w-60"}`}
    >
      <div className={`flex items-center gap-2 px-3 pt-3 ${collapsed ? "justify-center" : "justify-between"}`}>
        {collapsed ? null : <p className="px-1 text-sm font-semibold tracking-[0.22em]">VOW</p>}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-ink/[0.05] hover:text-ink"
        >
          <LineIcon name="panel" className="h-4 w-4" />
        </button>
      </div>
      <Link
        href={items.find((item) => item.label === "Accueil")?.href ?? "/espace"}
        title={weddingName}
        className={`mx-3 mt-3 flex items-center gap-3 rounded-2xl border border-line bg-ivory/70 px-3 py-3 transition hover:bg-ink/[0.04] ${collapsed ? "justify-center px-0" : ""}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-ivory">
          {monogram(weddingName)}
        </span>
        {collapsed ? null : (
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{weddingName}</span>
            {countdown ? <span className="block truncate text-xs text-muted">{countdown}</span> : null}
          </span>
        )}
      </Link>
      {extra}
      <nav aria-label={navLabel} className="mt-4 flex-1 space-y-4 overflow-y-auto px-2">
        {groups.map((group) => {
          const rows = group.labels.flatMap((label) => items.filter((item) => item.label === label));
          if (rows.length === 0) return null;
          return (
            <div key={group.caption}>
              {collapsed ? null : (
                <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted">{group.caption}</p>
              )}
              <ul className="grid gap-0.5">
                {rows.map((item) => (
                  <li key={item.href + item.label}>
                    <RailLink item={item} active={isActive(path, item.href)} collapsed={collapsed} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-line p-2">
        <div className={`flex items-center gap-2 px-2 py-2 ${collapsed ? "justify-center" : ""}`}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mist text-xs font-medium">{monogram(userName)}</span>
          {collapsed ? null : <span className="min-w-0 truncate text-sm">{userName}</span>}
        </div>
        {account && account.length > 0 ? (
          <div className="mb-1">
            {account.map((item) => (
              <RailLink key={item.href} item={item} active={isActive(path, item.href)} collapsed={collapsed} />
            ))}
          </div>
        ) : (
          <>
            {settings ? <RailLink item={settings} active={isActive(path, settings.href)} collapsed={collapsed} /> : null}
            {admin ? <RailLink item={admin} active={isActive(path, admin.href)} collapsed={collapsed} /> : null}
          </>
        )}
        <form action={signOut}>
          <button
            type="submit"
            title="Déconnexion"
            className={`flex min-h-10 w-full items-center gap-3 rounded-full px-3 text-sm text-muted transition hover:bg-ink/[0.05] hover:text-ink ${collapsed ? "justify-center px-0" : ""}`}
          >
            <LineIcon name="logout" className="h-[1.15rem] w-[1.15rem]" />
            {collapsed ? <span className="sr-only">Déconnexion</span> : <span>Déconnexion</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}

function RailLink({ item, active, collapsed }: { item: Item; active: boolean; collapsed: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={`relative flex min-h-10 items-center gap-3 rounded-full px-3 text-sm transition ${
        collapsed ? "justify-center px-0" : ""
      } ${active ? "bg-ink/[0.07] font-medium text-ink" : "text-muted hover:bg-ink/[0.04] hover:text-ink"}`}
    >
      {active ? <span className="absolute left-1.5 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-ink" aria-hidden /> : null}
      <LineIcon name={item.icon} className="h-[1.15rem] w-[1.15rem]" />
      {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function isActive(path: string, href: string) {
  if (href === "/espace" || href === "/reglages" || href === "/admin" || href === "/abonnement") return path === href;
  if (/^\/mariage\/[^/]+$/.test(href)) return path === href;
  return path === href || path.startsWith(`${href}/`);
}

function monogram(name: string) {
  const parts = name.replace(/^Mariage de\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "V";
}
