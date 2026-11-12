"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { cn } from "@/lib/cn";
import { LineIcon, type IconName } from "@/components/ui/line-icon";

export type { IconName };

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
        variant === "tab" && "flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-center text-xs font-medium leading-tight",
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
      <LineIcon name={icon} className="h-5 w-5" />
      <span className={tab ? "max-w-full truncate text-center text-xs leading-none" : undefined}>{label}</span>
      {pending ? <span className="sr-only">Chargement</span> : null}
      {active ? <span className="sr-only">Page actuelle</span> : null}
    </span>
  );
}

