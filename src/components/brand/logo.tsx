import { cn } from "@/lib/cn";

const star = "M0 -6.2 L1.15 -1.35 L6.1 -1.15 L1.9 1.55 L3.15 6.2 L0 3.35 L-3.15 6.2 L-1.9 1.55 L-6.1 -1.15 L-1.15 -1.35 Z";

export function Logo({ variant = "ink", className }: { variant?: "ink" | "white"; className?: string }) {
  const ink = variant === "white" ? "#F7F3EC" : "#1C1B19";
  return (
    <svg viewBox="0 0 196 40" className={cn("h-6 w-[8.5rem]", className)} role="img" aria-label="VOW">
      <path d="M4 7.5 22.5 33.5" fill="none" stroke={ink} strokeWidth="1.35" strokeLinejoin="miter" />
      <path d="M41 7.5 24.2 33.5" fill="none" stroke={ink} strokeWidth="1.35" strokeLinejoin="miter" />
      <circle cx="78" cy="22" r="11.2" fill="none" stroke={ink} strokeWidth="1.25" />
      <path d={star} fill="#C8A46A" transform="translate(78 6.4) scale(0.72)" />
      <path d="M112 7.5 124.5 33.5" fill="none" stroke={ink} strokeWidth="1.35" />
      <path d="M137 7.5 126.2 33.5" fill="none" stroke={ink} strokeWidth="1.35" />
      <path d="M137 7.5 149.5 33.5" fill="none" stroke={ink} strokeWidth="1.35" />
      <path d="M162 7.5 151.2 33.5" fill="none" stroke={ink} strokeWidth="1.35" />
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
