import { cn } from "@/lib/cn";

const star = "M0 -6.2 L1.15 -1.35 L6.1 -1.15 L1.9 1.55 L3.15 6.2 L0 3.35 L-3.15 6.2 L-1.9 1.55 L-6.1 -1.15 L-1.15 -1.35 Z";

export function Logo({ variant = "ink", className }: { variant?: "ink" | "white"; className?: string }) {
  const ink = variant === "white" ? "#F7F3EC" : "#1C1B19";
  return (
    <svg viewBox="0 0 108 40" className={cn("h-[38px] w-auto", variant === "white" && "drop-shadow-[0_1px_2px_rgba(18,17,16,0.55)]", className)} role="img" aria-label="VOW">
      <path d="M1 8 15 34" fill="none" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M29 8 15 34" fill="none" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="44" cy="22" r="10.5" fill="none" stroke={ink} strokeWidth="2.3" />
      <path d={star} fill="#C8A46A" transform="translate(44 7.2) scale(0.62)" />
      <path d="M59 8 69 34" fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M79 8 70 34" fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M79 8 89 34" fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M99 8 90 34" fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function LogoMark({ variant = "ink", className }: { variant?: "ink" | "white"; className?: string }) {
  const ground = variant === "white" ? "#F7F3EC" : "#1C1B19";
  const ring = variant === "white" ? "#1C1B19" : "#F7F3EC";
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="VOW">
      <rect width="32" height="32" rx="7" fill={ground} />
      <circle cx="16" cy="17.2" r="7.2" fill="none" stroke={ring} strokeWidth="1.15" />
      <path d={star} fill="#C8A46A" transform="translate(16 8.4) scale(0.42)" />
    </svg>
  );
}
