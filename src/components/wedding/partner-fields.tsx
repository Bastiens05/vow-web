import { Field, TextInput } from "@/components/ui/field";

export function PartnerFields() {
  return (
    <>
      <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
        <p className="text-sm font-medium sm:col-span-2">Partenaire 1</p>
        <Field label="Prénom">
          <TextInput name="partner_one" required autoComplete="given-name" placeholder="Léa" />
        </Field>
        <Field label="Nom">
          <TextInput name="partner_one_last" required autoComplete="family-name" placeholder="Martin" />
        </Field>
      </div>
      <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
        <p className="text-sm font-medium sm:col-span-2">Partenaire 2</p>
        <Field label="Prénom">
          <TextInput name="partner_two" required autoComplete="off" placeholder="Hugo" />
        </Field>
        <Field label="Nom">
          <TextInput name="partner_two_last" required autoComplete="off" placeholder="Bernard" />
        </Field>
      </div>
    </>
  );
}
