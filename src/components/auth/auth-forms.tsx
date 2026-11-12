"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PasswordField } from "@/components/auth/password-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { signIn, signUp, type ActionState } from "@/server/actions/auth";

const initial: ActionState = {};

export function LoginForm({ nextPath, initialEmail = "" }: { nextPath: string; initialEmail?: string }) {
  const [state, action, pending] = useActionState(signIn, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <Field label="E-mail">
        <TextInput name="email" type="email" autoComplete="email" required defaultValue={initialEmail} />
      </Field>
      <PasswordField label="Mot de passe" name="password" autoComplete="current-password" />
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
      <p className="text-center text-sm">
        <Link href="/mot-de-passe-oublie" className="text-accent">
          Mot de passe oublié ?
        </Link>
      </p>
    </form>
  );
}

export function SignupForm({
  nextPath,
  defaultEmail = "",
  lockedRole,
  extras,
}: {
  nextPath: string;
  defaultEmail?: string;
  lockedRole?: "vendor" | "couple";
  extras?: Record<string, string>;
}) {
  const [state, action, pending] = useActionState(signUp, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      {Object.entries(extras ?? {}).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <Field label="Nom complet">
        <TextInput name="full_name" autoComplete="name" required minLength={2} />
      </Field>
      <Field label="E-mail">
        <TextInput
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={defaultEmail}
          readOnly={Boolean(defaultEmail)}
        />
      </Field>
      <PasswordField label="Mot de passe" name="password" autoComplete="new-password" hint="8 caractères minimum." />
      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-sm text-ink">Je suis</legend>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["vendor", "Prestataire"],
            ["couple", "Couple"],
          ] as const).map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm has-[:checked]:border-ink has-[:checked]:bg-ivory"
            >
              <input
                type="radio"
                name="role"
                value={value}
                defaultChecked={lockedRole ? lockedRole === value : value === "vendor"}
                disabled={Boolean(lockedRole && lockedRole !== value)}
                className="accent-ink"
                required
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
