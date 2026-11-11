"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { sendMagicLink, signIn, signUp, type ActionState } from "@/server/actions/auth";

const initial: ActionState = {};

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(signIn, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <Field label="E-mail">
        <TextInput name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Mot de passe">
        <TextInput name="password" type="password" autoComplete="current-password" required minLength={8} />
      </Field>
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}

export function MagicLinkForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <Field label="E-mail" hint="Pour un compte déjà créé.">
        <TextInput name="email" type="email" autoComplete="email" required />
      </Field>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" variant="secondary" disabled={pending} className="w-full">
        {pending ? "Envoi…" : "Recevoir un lien magique"}
      </Button>
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
      <Field label="Mot de passe" hint="8 caractères minimum.">
        <TextInput name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
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
