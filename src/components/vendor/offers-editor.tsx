"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/field";
import { FrenchDateInput } from "@/components/ui/french-date";
import { formatPriceCents } from "@/lib/domain/price";
import { promoBadge, type PromoKind } from "@/lib/domain/promo";
import type { Tables, VendorCategory } from "@/lib/database.types";
import { offerExample } from "@/lib/domain/trades";
import { addOffer, deleteOffer, saveOfferPromo } from "@/server/actions/vendor";

export function OffersEditor({ offers, category = null }: { offers: Tables<"vendor_offers">[]; category?: VendorCategory | null }) {
  const [state, action, pending] = useActionState(addOffer, {});
  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {offers.map((offer) => (
          <OfferRow key={offer.id} offer={offer} />
        ))}
      </ul>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <Field label="Nouvelle offre">
          <TextInput name="title" required placeholder={offerExample(category)} />
        </Field>
        <Field label="Prix (€)">
          <TextInput name="price" inputMode="decimal" placeholder="Prix" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Détail">
            <TextArea name="description" className="min-h-20" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <PromoFields />
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

function OfferRow({ offer }: { offer: Tables<"vendor_offers"> }) {
  const hasPromo = Boolean(offer.promo_kind && offer.promo_value !== null);
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(saveOfferPromo, {});
  return (
    <li className="rounded-xl border border-line px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium">{offer.title}</p>
          {offer.description ? <p className="mt-1 text-sm text-muted">{offer.description}</p> : null}
          {offer.price_cents !== null ? (
            <p className="mt-1 text-sm text-gold-deep">{formatPriceCents(offer.price_cents)}</p>
          ) : null}
          {hasPromo ? (
            <p className="mt-1 text-sm">{promoBadge({
              priceCents: offer.price_cents,
              promoKind: offer.promo_kind,
              promoValue: offer.promo_value,
              promoLabel: offer.promo_label,
              promoStartsOn: offer.promo_starts_on,
              promoEndsOn: offer.promo_ends_on,
            })}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setEditing((value) => !value)}>
            {hasPromo ? "Modifier" : "Ajouter une promo"}
          </Button>
          {hasPromo ? (
            <form action={action}>
              <input type="hidden" name="id" value={offer.id} />
              <input type="hidden" name="remove" value="on" />
              <input type="hidden" name="price_cents" value={offer.price_cents ?? ""} />
              <Button type="submit" variant="ghost">Retirer la promo</Button>
            </form>
          ) : null}
          <form action={deleteOffer}>
            <input type="hidden" name="id" value={offer.id} />
            <Button type="submit" variant="danger">Retirer</Button>
          </form>
        </div>
      </div>
      {editing ? (
        <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={offer.id} />
          <input type="hidden" name="price_cents" value={offer.price_cents ?? ""} />
          <input type="hidden" name="promo" value="on" />
          <PromoFields
            kind={offer.promo_kind}
            value={offer.promo_kind === "amount" && offer.promo_value !== null ? String(offer.promo_value / 100) : offer.promo_value !== null ? String(offer.promo_value) : ""}
            label={offer.promo_label}
            starts={offer.promo_starts_on ?? ""}
            ends={offer.promo_ends_on ?? ""}
            open
          />
          {state.error ? <div className="sm:col-span-2"><Alert>{state.error}</Alert></div> : null}
          {state.success ? <div className="sm:col-span-2"><Alert tone="success">{state.success}</Alert></div> : null}
          <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer la promo"}</Button>
        </form>
      ) : null}
    </li>
  );
}

function PromoFields({
  kind = null,
  value = "",
  label = "",
  starts = "",
  ends = "",
  open = false,
}: {
  kind?: PromoKind | null;
  value?: string;
  label?: string;
  starts?: string;
  ends?: string;
  open?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
      {open ? null : (
        <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="promo" className="h-4 w-4" />
          Ajouter une promo
        </label>
      )}
      <Field label="Type">
        <SelectInput name="promo_kind" defaultValue={kind ?? "percent"}>
          <option value="percent">Pourcentage</option>
          <option value="amount">Montant en euros</option>
        </SelectInput>
      </Field>
      <Field label="Valeur">
        <TextInput name="promo_value" inputMode="decimal" defaultValue={value} placeholder="10" />
      </Field>
      <Field label="Libellé" hint="Facultatif.">
        <TextInput name="promo_label" defaultValue={label} placeholder="Lancement" />
      </Field>
      <Field label="Début" hint="Facultatif.">
        <FrenchDateInput name="promo_starts_on" defaultValue={starts} />
      </Field>
      <Field label="Fin" hint="Facultatif. La promo s'arrête après cette date.">
        <FrenchDateInput name="promo_ends_on" defaultValue={ends} />
      </Field>
    </div>
  );
}
