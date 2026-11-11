"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import type { ActionState } from "@/server/actions/auth";
import { redeemTesterCode, startSubscription } from "@/server/actions/billing";

const initial: ActionState = {};

export function SubscribeButton({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return (
      <Button type="button" disabled className="w-full sm:w-auto">
        Paiement bientôt disponible
      </Button>
    );
  }
  return (
    <form action={startSubscription}>
      <Button type="submit">S&apos;abonner</Button>
    </form>
  );
}

export function RedeemForm() {
  const [state, action, pending] = useActionState(redeemTesterCode, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <Field label="Code">
        <TextInput name="tester_code" autoComplete="off" minLength={8} />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Vérification…" : "Activer"}
      </Button>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
    </form>
  );
}
