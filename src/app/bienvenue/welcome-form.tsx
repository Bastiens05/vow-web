"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AuthDesktopFrame } from "@/components/auth/auth-frame";
import { Alert } from "@/components/ui/alert";
import { LogoField } from "@/components/account/settings-forms";
import { VENDOR_CATEGORIES, categoryLabel, type VendorCategory } from "@/lib/domain/categories";
import { completeVendor } from "@/server/actions/auth";

export function WelcomeForm({ logo, userId, logoPath }: { logo: boolean; userId: string; logoPath: string | null }) {
  const [category, setCategory] = useState<VendorCategory>("photographer");
  const [state, action, pending] = useActionState(completeVendor, {});
  if (logo) {
    return (
      <AuthDesktopFrame>
      <div className="auth-screen auth-step flex min-h-[calc(100dvh-3.5rem)] w-full flex-col px-5 py-10 md:min-h-dvh md:justify-center lg:min-h-dvh lg:px-16">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:flex-none">
        <p className="text-sm font-semibold tracking-[0.28em] lg:sr-only">VOW</p>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Votre logo</h1>
        <p className="mt-2 text-base leading-7 text-muted">Facultatif. Vous pourrez le changer plus tard.</p>
        <div className="mt-8">
          <LogoField userId={userId} logoPath={logoPath} />
        </div>
        <Link href="/espace" className="auth-primary mt-6 inline-flex items-center justify-center">
          Continuer
        </Link>
      </div>
      </div>
      </AuthDesktopFrame>
    );
  }
  return (
    <AuthDesktopFrame>
    <div className="auth-screen auth-step flex min-h-[calc(100dvh-3.5rem)] w-full flex-col px-5 py-10 md:min-h-dvh md:justify-center lg:min-h-dvh lg:px-16">
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:flex-none">
      <p className="text-sm font-semibold tracking-[0.28em] lg:sr-only">VOW</p>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">Votre activité</h1>
      <p className="mt-2 text-base leading-7 text-muted">Le nom, le métier et la ville. Le reste viendra après.</p>
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
            className="auth-field min-h-14 rounded-2xl border border-line bg-paper px-4 text-lg text-ink outline-none focus:border-ink"
            placeholder="Atelier Lumière"
          />
        </label>
        <label className="grid gap-2 text-sm">
          Ville
          <input
            name="city"
            autoComplete="address-level2"
            required
            minLength={2}
            className="auth-field min-h-14 rounded-2xl border border-line bg-paper px-4 text-lg text-ink outline-none focus:border-ink"
            placeholder="Bordeaux"
          />
        </label>
        {state.error ? <Alert>{state.error}</Alert> : null}
        <button type="submit" className="auth-primary" disabled={pending}>
          {pending ? "Enregistrement…" : "Continuer"}
        </button>
      </form>
      <p className="mt-auto pt-10 text-center text-xs text-muted">
        <Link href="/cgu" className="underline">CGU</Link>
        {" · "}
        <Link href="/confidentialite" className="underline">Confidentialité</Link>
      </p>
    </div>
    </div>
    </AuthDesktopFrame>
  );
}
