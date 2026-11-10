export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-deep">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight text-ink sm:text-5xl">{title}</h1>
        {description ? <p className="mt-3 text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Container({
  children,
  narrow = false,
}: {
  children: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <div className={narrow ? "mx-auto w-full max-w-lg px-4 py-10 sm:py-16" : "mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12"}>
      {children}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-paper/70 px-5 py-10 text-center">
      <p className="font-serif text-2xl text-ink">{title}</p>
      {children ? <div className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">{children}</div> : null}
    </div>
  );
}
