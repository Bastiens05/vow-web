import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Confidentialité" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-lg px-5 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Confidentialité</h1>
      <p className="mt-4 text-base leading-7 text-muted">
        Ce texte est un emplacement. Il décrira quelles données VOW garde, et pour qui.
      </p>
      <p className="mt-8 text-sm">
        <Link href="/connexion" className="underline">Retour</Link>
      </p>
    </article>
  );
}
