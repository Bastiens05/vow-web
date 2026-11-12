import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

export function AuthDesktopFrame({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <Logo variant="white" />
        <div>
          <p className="max-w-sm font-serif text-4xl font-normal text-[#f7f3ec]">Le mariage, dans un seul espace.</p>
          <p className="mt-4 max-w-sm text-base leading-7 text-[#f7f3ec]/75">
            Prestataires et couples, du premier message jusqu&apos;au jour J.
          </p>
        </div>
        <p className="text-sm text-[#f7f3ec]/70">Imaginé près de Bordeaux.</p>
      </aside>
      {children}
    </div>
  );
}
