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
        {eyebrow ? <p className="text-sm font-medium text-accent">{eyebrow}</p> : null}
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{title}</h1>
        {description ? <p className="mt-3 text-base leading-7 text-ink">{description}</p> : null}
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
    <div className="rounded-2xl border border-dashed border-line bg-paper px-5 py-10 text-center">
      <p className="text-lg font-semibold tracking-tight">{title}</p>
      {children ? <div className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">{children}</div> : null}
    </div>
  );
}
