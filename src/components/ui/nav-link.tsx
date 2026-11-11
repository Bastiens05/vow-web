"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { cn } from "@/lib/cn";

export type IconName = "home" | "message" | "clock" | "file" | "people" | "spark" | "user" | "camera" | "bell" | "gear" | "list" | "mail";

export function NavLink({
  href,
  label,
  icon,
  active,
  variant,
}: {
  href: string;
  label: string;
  icon: IconName;
  active: boolean;
  variant: "side" | "tab";
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        variant === "side" && "flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm transition",
        variant === "side" && (active ? "bg-ink/[0.06] font-medium text-ink" : "text-ink hover:bg-ink/[0.04]"),
        variant === "tab" && "flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-center text-[11px] font-medium leading-tight",
        variant === "tab" && (active ? "text-ink" : "text-muted"),
      )}
    >
      <NavBody label={label} icon={icon} tab={variant === "tab"} active={active} />
    </Link>
  );
}

function NavBody({ label, icon, tab, active }: { label: string; icon: IconName; tab: boolean; active: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <span className={cn("inline-flex items-center gap-2", tab && "flex-col gap-1", pending && "opacity-60")}>
      <TabIcon name={icon} />
      <span>{label}</span>
      {pending ? <span className="sr-only">Chargement</span> : null}
      {active ? <span className="sr-only">Page actuelle</span> : null}
    </span>
  );
}

function TabIcon({ name }: { name: IconName }) {
  const common = "h-5 w-5";
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
      </svg>
    );
  }
  if (name === "message") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M5 6h14v9H8l-3 3V6Z" />
      </svg>
    );
  }
  if (name === "clock") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  }
  if (name === "file") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M7 3h7l5 5v13H7V3Z" />
      </svg>
    );
  }
  if (name === "people") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="9" cy="9" r="3" />
        <circle cx="16" cy="10" r="2.2" />
        <path d="M4 19c.6-2.5 2.5-4 5-4s4.4 1.5 5 4M14 15.2c1.6-.2 3.2.6 4 2.8" />
      </svg>
    );
  }
  if (name === "camera") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M4 8h4l2-2h4l2 2h4v10H4V8Z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    );
  }
  if (name === "bell") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16Z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
    );
  }
  if (name === "gear") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
      </svg>
    );
  }
  if (name === "mail") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M4 7h16v10H4V7Z" />
        <path d="m4 8 8 6 8-6" />
      </svg>
    );
  }
  if (name === "list") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M8 7h12M8 12h12M8 17h12" />
        <circle cx="4" cy="7" r="1" fill="currentColor" />
        <circle cx="4" cy="12" r="1" fill="currentColor" />
        <circle cx="4" cy="17" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (name === "user") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="9" r="3" />
        <path d="M6 19c1-2.5 3-4 6-4s5 1.5 6 4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </svg>
  );
}
