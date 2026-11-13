"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/server/actions/auth";
import { acceptInvitation, declineInvitation } from "@/server/actions/weddings";

const initial: ActionState = {};

export function InviteDecisionCard({ token, title, role }: { token: string; title: string; role: string }) {
  const router = useRouter();
  const [state, decline, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const next = await declineInvitation(prev, formData);
    if (next.success) router.refresh();
    return next;
  }, initial);
  const who = role === "vendor" ? "prestataire" : "couple";

  if (state.success) return null;

  return (
    <div className="rounded-3xl border border-line bg-paper px-4 py-4">
      <p className="text-sm leading-6">
        Invitation pour {title}, en tant que {who}.
      </p>
      {state.error ? (
        <div className="mt-3">
          <Alert>{state.error}</Alert>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <form action={acceptInvitation}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit">Accepter</Button>
        </form>
        <form action={decline}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Refus…" : "Refuser"}
          </Button>
        </form>
      </div>
    </div>
  );
}
