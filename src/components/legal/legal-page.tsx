import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl px-5 py-12 text-base leading-7">
      <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-8 space-y-4">{children}</div>
      <p className="mt-10 text-sm">
        <Link href="/cgu" className="underline">CGU</Link>
        {" · "}
        <Link href="/confidentialite" className="underline">Confidentialité</Link>
        {" · "}
        <Link href="/mentions-legales" className="underline">Mentions légales</Link>
      </p>
    </article>
  );
}
