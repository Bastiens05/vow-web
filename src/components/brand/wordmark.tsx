import { cn } from "@/lib/cn";

export function Wordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 148 28" className={cn("h-5 w-[7.4rem] text-ink", className)} role="img" aria-label="VOW">
      <text fill="currentColor" fontFamily="var(--font-outfit), 'Avenir Next', 'Century Gothic', Futura, sans-serif" fontSize="22" fontWeight="300">
        <tspan x="2" y="22">V</tspan>
        <tspan x="52" y="22">O</tspan>
        <tspan x="102" y="22">W</tspan>
      </text>
    </svg>
  );
}
