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
    <Link href={href} className="flex min-h-12 items-center gap-3 border-b border-line px-4 py-2 transition active:scale-[0.99] last:border-b-0 hover:bg-ink/[0.03]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-accent">{icon}</span>
      <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
      <StatusMark status={status} />
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}

function StatusMark({ status }: { status: string }) {
  const tone = /complét|payé|prêt/i.test(status) ? "ok" : "muted";
  const dotOnly = /^(à compléter|complétée|complété)$/i.test(status.trim());
  return (
    <span className="inline-flex shrink-0 items-center gap-2">
      <span
        className={`h-2 w-2 rounded-full ${tone === "ok" ? "bg-ok" : "bg-muted"}`}
        aria-hidden
      />
      <span className={dotOnly ? "sr-only" : "text-sm text-muted"}>{status}</span>
    </span>
  );
}

export function LineIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      {children}
    </svg>
  );
}
