"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { deleteAccount } from "@/server/actions/account";
import type { ActionState } from "@/server/actions/auth";

const initial: ActionState = {};

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, initial);
  return (
    <form action={action} className="grid gap-3">
      <p className="text-sm leading-6 text-muted">
        Le compte, les messages et les fichiers personnels sont effacés. Les factures déjà émises restent conservées, avec les paiements qui les justifient, pendant le délai légal.
      </p>
      <label className="grid gap-2 text-sm">
        Écrivez SUPPRIMER pour confirmer
        <input
          name="confirm"
          autoComplete="off"
          required
          className="min-h-12 rounded-2xl border border-line bg-paper px-4"
        />
      </label>
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Suppression…" : "Supprimer mon compte"}
      </Button>
    </form>
  );
}
