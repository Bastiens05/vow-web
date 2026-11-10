import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Conditions" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-lg px-5 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Conditions d&apos;utilisation</h1>
      <p className="mt-4 text-base leading-7 text-muted">
        Ce texte est un emplacement. Les conditions définitives seront publiées avant l&apos;ouverture au public.
      </p>
      <p className="mt-8 text-sm">
        <Link href="/connexion" className="underline">Retour</Link>
      </p>
    </article>
  );
}
