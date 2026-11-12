import { cn } from "@/lib/cn";

export function Badge({
  children,
  className,
  tone = "accent",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "accent" | "photo";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.16em]",
        tone === "photo" ? "bg-black/35 text-[var(--vow-on-photo)]" : "bg-accent-soft text-accent",
        className,
      )}
    >
      {children}
    </span>
  );
}
