"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AddressInput } from "@/components/ui/address-input";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { PROFILE_FIELDS, type ProfileFacts } from "@/lib/domain/profile";
import { savePracticalJourney } from "@/server/actions/profile";

const STEPS = [
  { title: "Le lieu", keys: ["ceremony_address"] },
  { title: "Les horaires", keys: ["ceremony_time", "dinner_time", "party_end", "access_time"] },
  { title: "Les personnes", keys: ["guest_adults", "guest_children", "key_contacts", "on_site_contact", "partner_one_phone", "partner_two_phone"] },
  { title: "Le jour J", keys: [] as string[] },
];

const LONG = new Set(["diets", "key_contacts", "story", "must_happen", "keep_simple", "notes"]);

export function PracticalJourney({
  weddingId,
  facts,
  phones,
  notes,
}: {
  weddingId: string;
  facts: ProfileFacts;
  phones: { one: string; two: string };
  notes: string;
}) {
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState(facts.ceremony_address ?? "");
  const [samePlace, setSamePlace] = useState((facts.reception_address ?? "") === "" || facts.reception_address === facts.ceremony_address);
  const [state, action, pending] = useActionState(savePracticalJourney.bind(null, weddingId), {});
  const current = STEPS[step] ?? STEPS[0]!;
  const shown = new Set(STEPS.flatMap((item) => item.keys));
  const rest = PROFILE_FIELDS.filter((field) => !shown.has(field.key) && field.key !== "reception_address");
  return (
    <form action={action} className="grid gap-4">
      <p className="text-sm text-muted">Étape {step + 1} sur {STEPS.length} · {current.title}</p>
      <div className={step === 0 ? "grid gap-4" : "hidden"}>
        <Field label="Adresse du jour" hint="Une seule saisie. Elle place la cérémonie et, si vous le laissez coché, la réception.">
          <AddressInput name="ceremony_address" value={address} onValueChange={setAddress} weddingId={weddingId} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="same_place" checked={samePlace} onChange={(event) => setSamePlace(event.target.checked)} />
          La réception est au même endroit
        </label>
        {samePlace ? <input type="hidden" name="reception_address" value={address} /> : (
          <Field label="Adresse de la réception">
            <AddressInput name="reception_address" defaultValue={facts.reception_address ?? ""} weddingId={weddingId} />
          </Field>
        )}
      </div>
      {STEPS.slice(1, 3).map((item, index) => (
        <div key={item.title} className={step === index + 1 ? "grid gap-4" : "hidden"}>
          {item.keys.map((key) => fieldFor(key, facts, phones))}
        </div>
      ))}
      <div className={step === 3 ? "grid gap-4" : "hidden"}>
        {rest.map((field) => fieldFor(field.key, facts, phones))}
        <Field label="Notes">
          <TextArea name="notes" defaultValue={notes} className="min-h-20" />
        </Field>
      </div>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {step > 0 ? (
          <Button type="button" variant="secondary" onClick={() => setStep((value) => value - 1)}>
            Étape précédente
          </Button>
        ) : null}
        {step < 3 ? (
          <Button type="button" onClick={() => setStep((value) => value + 1)}>
            Continuer
          </Button>
        ) : (
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        )}
      </div>
    </form>
  );
}

function fieldFor(key: string, facts: ProfileFacts, phones: { one: string; two: string }) {
  if (key === "partner_one_phone" || key === "partner_two_phone") {
    return (
      <Field key={key} label={key === "partner_one_phone" ? "Téléphone, premier partenaire" : "Téléphone, second partenaire"}>
        <TextInput name={key} defaultValue={key === "partner_one_phone" ? phones.one : phones.two} />
      </Field>
    );
  }
  const field = PROFILE_FIELDS.find((item) => item.key === key);
  if (!field) return null;
  return (
    <Field key={key} label={field.label} hint={field.hint}>
      {LONG.has(key) ? <TextArea name={key} defaultValue={facts[key] ?? ""} className="min-h-20" /> : <TextInput name={key} defaultValue={facts[key] ?? ""} />}
    </Field>
  );
}
