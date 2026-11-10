"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/field";
import { VENDOR_CATEGORIES, categoryLabel } from "@/lib/domain/categories";
import type { Tables } from "@/lib/database.types";
import type { ActionState } from "@/server/actions/auth";
import { saveVendorProfile } from "@/server/actions/vendor";

function centsToInput(cents: number | null): string {
  if (cents === null) return "";
  return (cents / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

export function ProfileForm({ vendor }: { vendor: Tables<"vendor_profiles"> | null }) {
  const [state, action, pending] = useActionState(saveVendorProfile, {} as ActionState);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom commercial">
          <TextInput name="business_name" required defaultValue={vendor?.business_name ?? ""} />
        </Field>
        <Field label="Lien public" hint="Lettres, chiffres et tirets. Laissé vide, il est déduit du nom.">
          <TextInput name="slug" defaultValue={vendor?.slug ?? ""} placeholder="atelier-lumiere" />
        </Field>
        <Field label="Catégorie">
          <SelectInput name="category" defaultValue={vendor?.category ?? "photographer"} required>
            {VENDOR_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Ville">
          <TextInput name="city" required defaultValue={vendor?.city ?? ""} placeholder="Bordeaux" />
        </Field>
        <Field label="Zone" hint="Le territoire que vous couvrez.">
          <TextInput name="zone" defaultValue={vendor?.zone ?? ""} placeholder="Bordeaux et le vignoble" />
        </Field>
        <Field label="Prix de départ (€)">
          <TextInput name="starting_price" inputMode="decimal" defaultValue={centsToInput(vendor?.starting_price_cents ?? null)} placeholder="350" />
        </Field>
      </div>
      <Field label="Présentation">
        <TextArea name="description" defaultValue={vendor?.description ?? ""} placeholder="Ce que les couples retiennent de votre façon de travailler." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="E-mail de contact">
          <TextInput name="contact_email" type="email" defaultValue={vendor?.contact_email ?? ""} />
        </Field>
        <Field label="Téléphone">
          <TextInput name="contact_phone" defaultValue={vendor?.contact_phone ?? ""} />
        </Field>
        <Field label="Site web">
          <TextInput name="website" defaultValue={vendor?.website ?? ""} placeholder="https://" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={vendor?.published ?? false} className="accent-[#c5a059]" />
        Publier la vitrine
      </label>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer la vitrine"}
      </Button>
    </form>
  );
}
