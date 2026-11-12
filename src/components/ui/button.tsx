import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "sharp" | "sharpGhost";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-ivory hover:opacity-90",
  secondary: "border border-line bg-paper text-ink hover:bg-ink/[0.04]",
  ghost: "text-muted hover:text-ink",
  danger: "border border-danger/30 bg-paper text-danger hover:bg-danger-bg",
  sharp: "bg-[var(--vow-on-photo)] text-[#1c1915] hover:opacity-90",
  sharpGhost: "border border-[var(--vow-on-photo)] bg-transparent text-[var(--vow-on-photo)] hover:bg-white/10",
};

export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  const sharp = variant === "sharp" || variant === "sharpGhost";
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-medium transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
    sharp ? "rounded-none" : "rounded-full",
    variants[variant],
    className,
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} prefetch className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}
