"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthDesktopFrame } from "@/components/auth/auth-frame";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { requestPasswordReset } from "@/server/actions/auth";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});
  return (
    <AuthDesktopFrame>
      <div className="auth-screen flex min-h-[calc(100dvh-3.5rem)] w-full flex-col px-5 py-10 md:min-h-dvh md:justify-center lg:min-h-dvh lg:justify-start lg:px-16 lg:py-12">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm font-semibold tracking-[0.28em] lg:sr-only">VOW</p>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight">Mot de passe oublié</h1>
          <p className="mt-2 text-base leading-7 text-muted">
            Un e-mail permet de choisir un nouveau mot de passe. C&apos;est aussi le chemin pour un compte créé sans mot de passe.
          </p>
          <form action={action} className="mt-8 space-y-4">
            <Field label="E-mail">
              <TextInput name="email" type="email" autoComplete="email" required />
            </Field>
            {state.error ? <Alert>{state.error}</Alert> : null}
            {state.success ? <Alert tone="success">{state.success}</Alert> : null}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Envoi…" : "Recevoir le lien"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">
            <Link href="/connexion" className="underline">
              Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </AuthDesktopFrame>
  );
}
