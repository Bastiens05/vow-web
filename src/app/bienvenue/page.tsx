"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { VENDOR_CATEGORIES, categoryLabel, type VendorCategory } from "@/lib/domain/categories";
import { completeVendor } from "@/server/actions/auth";

export default function WelcomePage() {
  const [category, setCategory] = useState<VendorCategory>("photographer");
  const [state, action, pending] = useActionState(completeVendor, {});
  return (
    <div className="auth-screen auth-step mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-md flex-col px-5 py-10">
      <p className="text-sm font-semibold tracking-[0.28em]">VOW</p>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">Votre métier</h1>
      <p className="mt-2 text-base leading-7 text-muted">Deux informations. Le reste viendra plus tard.</p>
      <form action={action} className="mt-8 grid gap-4">
        <div className="flex flex-wrap gap-2">
          {VENDOR_CATEGORIES.map((value) => (
            <button
              key={value}
              type="button"
              className={value === category ? "auth-chip auth-chip-on" : "auth-chip"}
              onClick={() => setCategory(value)}
            >
              {categoryLabel(value)}
            </button>
          ))}
        </div>
        <input type="hidden" name="category" value={category} />
        <label className="grid gap-2 text-sm">
          Nom de l&apos;activité
          <input
            name="business_name"
            autoFocus
            autoComplete="organization"
            required
            minLength={2}
            className="auth-field min-h-14 rounded-2xl border border-black/10 bg-white px-4 text-lg outline-none focus:border-ink"
            placeholder="Atelier Lumière"
          />
        </label>
        {state.error ? <Alert>{state.error}</Alert> : null}
        <button type="submit" className="auth-primary" disabled={pending}>
          {pending ? "Ouverture…" : "Entrer dans VOW"}
        </button>
      </form>
      <p className="mt-auto pt-10 text-center text-xs text-muted">
        <Link href="/cgu" className="underline">CGU</Link>
        {" · "}
        <Link href="/confidentialite" className="underline">Confidentialité</Link>
      </p>
    </div>
  );
}
