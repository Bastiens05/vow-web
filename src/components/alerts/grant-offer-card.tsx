"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/server/actions/auth";
import { activateTesterGrant } from "@/server/actions/tester-grants";

const initial: ActionState = {};

export function GrantOfferCard({
  grantId,
  body,
  activated,
}: {
  grantId: string;
  body: string;
  activated: boolean;
}) {
  const [state, action, pending] = useActionState(activateTesterGrant, initial);
  return (
    <li className="rounded-2xl border border-line bg-paper px-4 py-4">
      <p className="text-sm leading-6">{body}</p>
      {activated || state.success ? (
        <p className="mt-3 text-sm text-muted">Activée</p>
      ) : (
        <form action={action} className="mt-3">
          <input type="hidden" name="grant_id" value={grantId} />
          {state.error ? <Alert>{state.error}</Alert> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Activation…" : "Activer"}
          </Button>
        </form>
      )}
    </li>
  );
}
