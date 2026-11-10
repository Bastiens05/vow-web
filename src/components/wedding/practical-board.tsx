"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { addGuest, addPhotoGroup, deleteGuest, deletePhotoGroup, savePractical } from "@/server/actions/sheets";
import type { GuestRow, PhotoGroupRow, PracticalRow } from "@/server/data";

export function PracticalBoard({
  weddingId,
  practical,
  groups,
  guests,
  canEditDetails,
}: {
  weddingId: string;
  practical: PracticalRow | null;
  groups: PhotoGroupRow[];
  guests: GuestRow[];
  canEditDetails: boolean;
}) {
  return (
    <div className="space-y-8">
      <DetailsForm weddingId={weddingId} practical={practical} canEdit={canEditDetails} />
      <Groups weddingId={weddingId} groups={groups} />
      <Guests weddingId={weddingId} guests={guests} />
    </div>
  );
}

function DetailsForm({
  weddingId,
  practical,
  canEdit,
}: {
  weddingId: string;
  practical: PracticalRow | null;
  canEdit: boolean;
}) {
  const action = savePractical.bind(null, weddingId);
  const [state, formAction, pending] = useActionState(action, {});
  const fields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Téléphone, premier partenaire">
        <TextInput name="partner_one_phone" defaultValue={practical?.partner_one_phone ?? ""} disabled={!canEdit} />
      </Field>
      <Field label="Téléphone, second partenaire">
        <TextInput name="partner_two_phone" defaultValue={practical?.partner_two_phone ?? ""} disabled={!canEdit} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Adresse postale">
          <TextArea name="postal_address" defaultValue={practical?.postal_address ?? ""} disabled={!canEdit} className="min-h-20" />
        </Field>
      </div>
      <Field label="Adresse de la cérémonie">
        <TextArea name="ceremony_address" defaultValue={practical?.ceremony_address ?? ""} disabled={!canEdit} className="min-h-20" />
      </Field>
      <Field label="Adresse de la réception">
        <TextArea name="reception_address" defaultValue={practical?.reception_address ?? ""} disabled={!canEdit} className="min-h-20" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Contacts utiles" hint="Témoins, parents, régisseur. Un par ligne.">
          <TextArea name="key_contacts" defaultValue={practical?.key_contacts ?? ""} disabled={!canEdit} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Notes">
          <TextArea name="notes" defaultValue={practical?.notes ?? ""} disabled={!canEdit} className="min-h-20" />
        </Field>
      </div>
    </div>
  );
  if (!canEdit) return <section>{fields}</section>;
  return (
    <form action={formAction} className="space-y-4">
      {fields}
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Enregistrement…" : "Enregistrer les infos"}
      </Button>
    </form>
  );
}

function Groups({ weddingId, groups }: { weddingId: string; groups: PhotoGroupRow[] }) {
  const action = addPhotoGroup.bind(null, weddingId);
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">Photos de groupe</h2>
      <p className="mt-1 mb-4 text-sm text-muted">L’ordre de passage, les personnes, une note pour le photographe.</p>
      <ol className="space-y-2">
        {groups.map((group, index) => (
          <li key={group.id} className="flex items-start justify-between gap-3 rounded-2xl bg-ivory px-4 py-3">
            <div>
              <p className="text-xs text-muted">{index + 1}</p>
              <p className="font-medium">{group.title}</p>
              {group.people ? <p className="mt-1 text-sm text-muted">{group.people}</p> : null}
              {group.notes ? <p className="mt-1 text-sm">{group.notes}</p> : null}
            </div>
            <form action={deletePhotoGroup}>
              <input type="hidden" name="id" value={group.id} />
              <input type="hidden" name="wedding_id" value={weddingId} />
              <Button type="submit" variant="ghost">
                Retirer
              </Button>
            </form>
          </li>
        ))}
      </ol>
      <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Groupe">
          <TextInput name="title" required placeholder="Famille de la mariée" />
        </Field>
        <Field label="Personnes">
          <TextInput name="people" placeholder="Parents, frère, oncles" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Note">
            <TextInput name="notes" placeholder="Juste après la cérémonie" />
          </Field>
        </div>
        {state.error ? <Alert>{state.error}</Alert> : null}
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Ajout…" : "Ajouter le groupe"}
        </Button>
      </form>
    </section>
  );
}

function Guests({ weddingId, guests }: { weddingId: string; guests: GuestRow[] }) {
  const action = addGuest.bind(null, weddingId);
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">Invités</h2>
      <p className="mt-1 mb-4 text-sm text-muted">Table et régime, pour le traiteur et le plan de salle.</p>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Nom</th>
              <th className="px-3 py-2 font-medium">Table</th>
              <th className="px-3 py-2 font-medium">Régime</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {guests.map((guest) => (
              <tr key={guest.id} className="border-t border-line">
                <td className="px-3 py-2">
                  <p className="font-medium">{guest.full_name}</p>
                  {guest.notes ? <p className="text-xs text-muted">{guest.notes}</p> : null}
                </td>
                <td className="px-3 py-2">{guest.table_label}</td>
                <td className="px-3 py-2">{guest.dietary}</td>
                <td className="px-3 py-2 text-right">
                  <form action={deleteGuest}>
                    <input type="hidden" name="id" value={guest.id} />
                    <input type="hidden" name="wedding_id" value={weddingId} />
                    <button type="submit" className="text-xs text-muted underline">
                      Retirer
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Nom">
          <TextInput name="full_name" required />
        </Field>
        <Field label="Table">
          <TextInput name="table_label" placeholder="Table 3" />
        </Field>
        <Field label="Régime">
          <TextInput name="dietary" placeholder="Végétarien" />
        </Field>
        <Field label="Note">
          <TextInput name="notes" />
        </Field>
        {state.error ? (
          <div className="sm:col-span-2">
            <Alert>{state.error}</Alert>
          </div>
        ) : null}
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Ajout…" : "Ajouter l'invité"}
        </Button>
      </form>
    </section>
  );
}
