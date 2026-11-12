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
        {eyebrow ? <p className="text-xs font-medium text-accent">{eyebrow}</p> : null}
        <h1 className="mt-1 font-display text-3xl font-light tracking-tight sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-6 text-muted">{description}</p> : null}
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
    <div className={narrow ? "mx-auto w-full max-w-md px-5 py-8" : "mx-auto w-full max-w-5xl px-5 py-8 sm:py-10"}>
      {children}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-paper px-5 py-10 text-center shadow-[var(--vow-shadow)]">
      <p className="text-lg font-semibold tracking-tight">{title}</p>
      {children ? <div className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">{children}</div> : null}
    </div>
  );
}
