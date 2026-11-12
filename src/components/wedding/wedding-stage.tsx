import { cn } from "@/lib/cn";

export function WeddingStage({
  title,
  date,
  venue,
  figure,
  imageUrl,
  note = null,
  compact = false,
  children,
}: {
  title: string;
  date: string;
  venue: string;
  figure: string;
  imageUrl: string | null;
  note?: string | null;
  compact?: boolean;
  children?: React.ReactNode;
}) {
  const Title = compact ? "h3" : "h1";
  return (
    <section
      className={cn("relative overflow-hidden text-[var(--vow-on-photo)]", compact ? "min-h-[24rem]" : "min-h-[28rem]")}
      style={{ backgroundImage: "var(--vow-hero)" }}
    >
      {imageUrl ? <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/20" />
      <div className={cn("relative flex flex-col justify-end", compact ? "min-h-[24rem] p-5 pt-16 sm:p-6 sm:pt-16" : "min-h-[28rem] px-6 py-8 sm:px-10 sm:py-10")}>
        <Title className={cn("max-w-3xl font-display font-extralight tracking-tight", compact ? "text-4xl" : "text-5xl sm:text-7xl")}>{title}</Title>
        <p className={cn("text-[var(--vow-on-photo-muted)]", compact ? "mt-2 text-sm" : "mt-3 text-base")}>{date}</p>
        <p className={cn("text-[var(--vow-on-photo-muted)]", compact ? "text-sm" : "text-base")}>{venue}</p>
        {note ? <p className={cn("text-[var(--vow-on-photo-muted)]", compact ? "text-sm" : "text-base")}>{note}</p> : null}
        <p className={cn("font-display font-extralight leading-none tracking-tight text-[var(--vow-on-photo-accent)]", compact ? "mt-4 text-6xl" : "mt-6 text-7xl sm:text-8xl")}>
          {figure}
        </p>
        {children ? <div className="mt-6 flex flex-wrap gap-3">{children}</div> : null}
      </div>
    </section>
  );
}
