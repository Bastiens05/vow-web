import { cn } from "@/lib/cn";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-[0.95rem] font-light uppercase tracking-[0.46em]", className)} aria-label="VOW">
      VOW
    </span>
  );
}
