import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-3xl border border-line bg-paper p-6 shadow-[var(--vow-shadow)] sm:p-7", className)}>
      {children}
    </section>
  );
}
