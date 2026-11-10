"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { saveSharePrefs } from "@/server/actions/daypack";

export function ShareForm({ sharePhone, shareEmail }: { sharePhone: boolean; shareEmail: boolean }) {
  const [state, action, pending] = useActionState(saveSharePrefs, {});
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm leading-6 text-muted">
        Le téléphone et l&apos;e-mail restent cachés aux autres participants, sauf si vous les ouvrez ici.
      </p>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="share_phone" defaultChecked={sharePhone} className="h-4 w-4" />
        Montrer mon téléphone
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="share_email" defaultChecked={shareEmail} className="h-4 w-4" />
        Montrer mon e-mail
      </label>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer la visibilité"}
      </Button>
    </form>
  );
}
