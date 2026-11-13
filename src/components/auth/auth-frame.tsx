import type { ReactNode } from "react";
import { HeroPhoto } from "@/components/brand/hero-photo";
import { Logo } from "@/components/brand/logo";

export function AuthDesktopFrame({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <HeroPhoto src="/hero/auth.jpg" position="32% 48%" sizes="(min-width: 1024px) 42vw, 100vw" veil="auth" priority />
        <Logo variant="white" className="relative z-10" />
        <div className="relative z-10">
          <p className="max-w-sm font-serif text-4xl font-normal text-[#f7f3ec]">Le mariage, dans un seul espace.</p>
          <p className="mt-4 max-w-sm text-base leading-7 text-[#f7f3ec]">
            Prestataires et couples, du premier message jusqu&apos;au jour J.
          </p>
        </div>
        <p className="relative z-10 text-sm text-[#f7f3ec]">Imaginé près de Bordeaux.</p>
      </aside>
      {children}
    </div>
  );
}
