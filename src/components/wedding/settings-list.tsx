import Link from "next/link";
import type { ReactNode } from "react";

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="px-1 pb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">{title}</h3>
      <div className="overflow-hidden rounded-2xl bg-paper">{children}</div>
    </section>
  );
}

export function SettingsLink({
  href,
  label,
  status,
  icon,
}: {
  href: string;
  label: string;
  status: string;
  icon: ReactNode;
}) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-3 border-b border-black/10 px-4 py-2 last:border-b-0">
      <span className="text-ink/80">{icon}</span>
      <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
      <span className="shrink-0 text-sm text-muted">{status}</span>
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}

export function LineIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      {children}
    </svg>
  );
}
