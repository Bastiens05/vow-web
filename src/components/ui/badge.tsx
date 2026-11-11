import { cn } from "@/lib/cn";

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-line bg-ivory px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
