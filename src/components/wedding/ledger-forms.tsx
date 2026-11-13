"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { FrenchDateInput } from "@/components/ui/french-date";
import { PAYMENT_KINDS, PAYMENT_METHODS, paymentKindLabel, paymentMethodLabel } from "@/lib/domain/finance";
import { createDeposit, createQuote, recordPayment, setAgreedPrice } from "@/server/actions/ledger";

export function AgreedPriceForm({ weddingId, amount }: { weddingId: string; amount: string }) {
  const [state, action, pending] = useActionState(setAgreedPrice.bind(null, weddingId), {});
  return (
    <Card>
      <h2 className="text-lg font-semibold">Prix convenu</h2>
      <p className="mt-1 text-sm text-muted">Le montant du devis pour ce mariage. Créer la facture fige ensuite le numéro et les mentions.</p>
      <form action={action} className="mt-3 grid gap-3">
        <Field label="Montant (€)">
          <TextInput name="amount" required inputMode="decimal" placeholder="2400" defaultValue={amount} />
        </Field>
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.success ? <Alert tone="success">{state.success}</Alert> : null}
        <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer le prix"}</Button>
      </form>
    </Card>
  );
}

export function PaymentForm({ weddingId, invoiceId }: { weddingId: string; invoiceId: string }) {
  const [state, action, pending] = useActionState(recordPayment.bind(null, weddingId), {});
  return (
    <form action={action} className="mt-3 grid gap-3 border-t border-line pt-3">
      <h3 className="text-sm font-semibold">Enregistrer un paiement</h3>
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <Field label="Type">
        <SelectInput name="kind" defaultValue="acompte">
          {PAYMENT_KINDS.map((kind) => (
            <option key={kind} value={kind}>{paymentKindLabel(kind)}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Montant (€)">
        <TextInput name="amount" required inputMode="decimal" placeholder="500" />
      </Field>
      <Field label="Date" hint="jj/mm/aaaa">
        <FrenchDateInput name="paid_on" required />
      </Field>
      <Field label="Moyen">
        <SelectInput name="method" defaultValue="virement">
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>{paymentMethodLabel(method)}</option>
          ))}
        </SelectInput>
      </Field>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer un paiement"}</Button>
    </form>
  );
}

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
          <FrenchDateInput name="due_on" required />
        </Field>
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.success ? <Alert tone="success">{state.success}</Alert> : null}
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Enregistrement…" : "Noter l'acompte"}</Button>
      </form>
    </Card>
  );
}
