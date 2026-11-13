"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { createDeposit, createQuote } from "@/server/actions/ledger";

export function QuoteForm({ weddingId }: { weddingId: string }) {
  const [state, action, pending] = useActionState(createQuote.bind(null, weddingId), {});
  return (
    <Card>
      <h2 className="text-lg font-semibold">Nouveau devis</h2>
      <form action={action} className="mt-3 grid gap-3">
        <Field label="Titre">
          <TextInput name="title" required placeholder="Reportage journée" />
        </Field>
        <Field label="Montant (€)">
          <TextInput name="amount" required inputMode="decimal" placeholder="2400" />
        </Field>
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.success ? <Alert tone="success">{state.success}</Alert> : null}
        <Button type="submit" disabled={pending}>{pending ? "Création…" : "Créer le devis"}</Button>
      </form>
    </Card>
  );
}

export function DepositForm({ weddingId }: { weddingId: string }) {
  const [state, action, pending] = useActionState(createDeposit.bind(null, weddingId), {});
  return (
    <Card>
      <h2 className="text-lg font-semibold">Acompte</h2>
      <p className="mt-1 text-sm text-muted">Le couple est rappelé dans l&apos;application trois jours avant l&apos;échéance. Le paiement Stripe reste fermé sans clés.</p>
      <form action={action} className="mt-3 grid gap-3">
        <Field label="Montant (€)">
          <TextInput name="amount" required inputMode="decimal" placeholder="500" />
        </Field>
        <Field label="Échéance" hint="jj/mm/aaaa">
          <TextInput name="due_on" lang="fr" inputMode="numeric" placeholder="jj/mm/aaaa" autoComplete="off" required pattern="\d{2}/\d{2}/\d{4}" title="jj/mm/aaaa" />
        </Field>
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.success ? <Alert tone="success">{state.success}</Alert> : null}
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Enregistrement…" : "Noter l'acompte"}</Button>
      </form>
    </Card>
  );
}
