"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { cn } from "@/lib/cn";

export function NavLink({
  href,
  label,
  active,
  variant,
}: {
  href: string;
  label: string;
  active: boolean;
  variant: "side" | "tab";
}) {
  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? "page" : undefined}
      className={cn(
        variant === "side" &&
          "flex min-h-11 items-center rounded-xl px-3 text-sm transition active:scale-[0.99]",
        variant === "side" && (active ? "bg-ink text-white" : "text-ink hover:bg-black/[0.04]"),
        variant === "tab" &&
          "flex min-h-12 flex-1 flex-col items-center justify-center px-1 text-[11px] leading-none tracking-tight",
        variant === "tab" && (active ? "font-semibold text-ink" : "text-muted"),
      )}
    >
      <NavBody label={label} tab={variant === "tab"} active={active} />
    </Link>
  );
}

function NavBody({ label, tab, active }: { label: string; tab: boolean; active: boolean }) {
  const { pending } = useLinkStatus();
  if (tab) {
    return (
      <span className={cn("flex flex-col items-center gap-1", pending && "opacity-50")}>
        <span className={cn("h-1 w-1 rounded-full", active || pending ? "bg-current" : "bg-transparent")} />
        <span>{label}</span>
        {pending ? <span className="sr-only">Chargement</span> : null}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-2", pending && "opacity-60")}>
      {pending ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden /> : null}
      <span>{label}</span>
      {pending ? <span className="sr-only">Chargement</span> : null}
    </span>
  );
}
