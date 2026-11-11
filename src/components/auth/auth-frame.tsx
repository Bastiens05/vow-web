import type { ReactNode } from "react";

export function AuthDesktopFrame({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <p className="text-sm font-semibold tracking-[0.28em]">VOW</p>
        <div>
          <p className="max-w-sm text-4xl font-semibold tracking-tight">Le mariage, dans un seul espace.</p>
          <p className="mt-4 max-w-sm text-base leading-7 text-muted">
            Prestataires et couples, du premier message jusqu&apos;au jour J.
          </p>
        </div>
        <p className="text-sm text-muted">Imaginé près de Bordeaux.</p>
      </aside>
      {children}
    </div>
  );
}
