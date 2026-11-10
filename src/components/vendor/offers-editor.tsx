"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { formatPriceCents } from "@/lib/domain/price";
import type { Tables } from "@/lib/database.types";
import { addOffer, deleteOffer } from "@/server/actions/vendor";

export function OffersEditor({ offers }: { offers: Tables<"vendor_offers">[] }) {
  const [state, action, pending] = useActionState(addOffer, {});
  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {offers.map((offer) => (
          <li key={offer.id} className="flex flex-col gap-2 rounded-xl border border-line px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-medium">{offer.title}</p>
              {offer.description ? <p className="mt-1 text-sm text-muted">{offer.description}</p> : null}
              {offer.price_cents !== null ? (
                <p className="mt-1 text-sm text-gold-deep">{formatPriceCents(offer.price_cents)}</p>
              ) : null}
            </div>
            <form action={deleteOffer}>
              <input type="hidden" name="id" value={offer.id} />
              <Button type="submit" variant="danger">
                Retirer
              </Button>
            </form>
          </li>
        ))}
      </ul>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <Field label="Nouvelle offre">
          <TextInput name="title" required placeholder="Reportage journée" />
        </Field>
        <Field label="Prix (€)">
          <TextInput name="price" inputMode="decimal" placeholder="2400" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Détail">
            <TextArea name="description" className="min-h-20" />
          </Field>
        </div>
        {state.error ? (
          <div className="sm:col-span-2">
            <Alert>{state.error}</Alert>
          </div>
        ) : null}
        {state.success ? (
          <div className="sm:col-span-2">
            <Alert tone="success">{state.success}</Alert>
          </div>
        ) : null}
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Ajout…" : "Ajouter l'offre"}
        </Button>
      </form>
    </div>
  );
}
