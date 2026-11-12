"use client";

import { useActionState } from "react";
import { PasswordField } from "@/components/auth/password-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { setNewPassword } from "@/server/actions/auth";

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(setNewPassword, {});
  return (
    <form action={action} className="space-y-4">
      <PasswordField label="Nouveau mot de passe" name="password" autoComplete="new-password" hint="8 caractères minimum." />
      <PasswordField label="Confirmation" name="confirm" autoComplete="new-password" />
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Enregistrement…" : "Enregistrer le mot de passe"}
      </Button>
    </form>
  );
}
