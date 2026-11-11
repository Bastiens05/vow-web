"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AddressInput } from "@/components/ui/address-input";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { formatSlotTime } from "@/lib/domain/format";
import { assignStep } from "@/server/actions/relay";
import { addTimelineComment, addTimelineSlot, deleteTimelineSlot, updateTimelineSlot } from "@/server/actions/space";
import type { SlotView } from "@/server/data";

export function TimelineBoard({
  weddingId,
  slots,
  canEdit,
  vendors = [],
}: {
  weddingId: string;
  slots: SlotView[];
  canEdit: boolean;
  vendors?: { userId: string; fullName: string }[];
}) {
  const addAction = addTimelineSlot.bind(null, weddingId);
  const [state, action, pending] = useActionState(addAction, {});

  return (
    <div className="space-y-8">
      <ol className="space-y-6 border-l border-gold/50 pl-5">
        {slots.length === 0 ? <li className="text-sm text-muted">Le déroulé est encore vide.</li> : null}
        {slots.map((slot) => (
          <li key={slot.id} className="relative">
            <span className="absolute -left-[1.45rem] top-1.5 h-2.5 w-2.5 rounded-full bg-gold" />
            <p className="font-semibold tracking-tight text-2xl">{formatSlotTime(slot.startsAt)}</p>
            <h2 className="text-lg font-medium">{slot.title}</h2>
            {slot.place ? <p className="text-sm text-muted">{slot.place}</p> : null}
            {slot.ready ? <p className="text-sm font-medium">Prêt</p> : null}
            {canEdit && vendors.length > 0 ? (
              <form action={assignStep} className="mt-2 flex items-center gap-2">
                <input type="hidden" name="wedding_id" value={weddingId} />
                <input type="hidden" name="slot_id" value={slot.id} />
                <select name="user_id" defaultValue={slot.assigneeIds[0] ?? ""} className="min-h-11 rounded-xl border border-line bg-ivory px-2 text-sm" aria-label={`Prestataire pour ${slot.title}`}>
                  <option value="">Personne</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.userId} value={vendor.userId}>
                      {vendor.fullName}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="secondary">
                  Attribuer
                </Button>
              </form>
            ) : null}
            {slot.notes ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{slot.notes}</p> : null}
            {canEdit ? (
              <SlotEditor weddingId={weddingId} slot={slot} />
            ) : null}
            <ul className="mt-3 space-y-2">
              {slot.comments.map((comment) => (
                <li key={comment.id} className="rounded-xl bg-ivory px-3 py-2 text-sm">
                  <span className="text-gold-deep">{comment.mine ? "Vous" : comment.authorName} · </span>
                  {comment.body}
                </li>
              ))}
            </ul>
            <CommentForm weddingId={weddingId} slotId={slot.id} />
          </li>
        ))}
      </ol>
      {canEdit ? (
        <form action={action} className="grid gap-3 rounded-2xl border border-line bg-paper p-4 sm:grid-cols-2">
          <Field label="Nouveau moment">
            <TextInput name="title" required placeholder="Cérémonie" />
          </Field>
          <Field label="Heure">
            <TextInput name="starts_at" type="time" required />
          </Field>
          <Field label="Lieu">
            <AddressInput name="place" placeholder="Jardin" weddingId={weddingId} />
          </Field>
          <Field label="Notes">
            <TextInput name="notes" placeholder="Entrée par l'allée des tilleuls" />
          </Field>
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
          <Button type="submit" disabled={pending}>
            {pending ? "Ajout…" : "Ajouter au déroulé"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted">Le déroulé est tenu par les prestataires. Vous pouvez commenter chaque moment.</p>
      )}
    </div>
  );
}

function SlotEditor({ weddingId, slot }: { weddingId: string; slot: SlotView }) {
  const action = updateTimelineSlot.bind(null, weddingId);
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm text-gold-deep">Modifier</summary>
      <form action={formAction} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={slot.id} />
        <Field label="Titre">
          <TextInput name="title" required defaultValue={slot.title} />
        </Field>
        <Field label="Heure">
          <TextInput name="starts_at" type="time" required defaultValue={formatSlotTime(slot.startsAt)} />
        </Field>
        <Field label="Lieu">
          <AddressInput name="place" defaultValue={slot.place} weddingId={weddingId} />
        </Field>
        <Field label="Notes">
          <TextInput name="notes" defaultValue={slot.notes} />
        </Field>
        {state.error ? (
          <div className="sm:col-span-2">
            <Alert>{state.error}</Alert>
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            Enregistrer
          </Button>
        </div>
      </form>
      <form action={deleteTimelineSlot} className="mt-2">
        <input type="hidden" name="id" value={slot.id} />
        <input type="hidden" name="wedding_id" value={weddingId} />
        <Button type="submit" variant="danger">
          Supprimer ce moment
        </Button>
      </form>
    </details>
  );
}

function CommentForm({ weddingId, slotId }: { weddingId: string; slotId: string }) {
  const action = addTimelineComment.bind(null, weddingId);
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="slot_id" value={slotId} />
      <label className="block flex-1 text-sm">
        Commentaire
        <TextArea name="body" required className="mt-1 min-h-16" />
      </label>
      <Button type="submit" variant="secondary" disabled={pending}>
        Commenter
      </Button>
      {state.error ? <Alert>{state.error}</Alert> : null}
    </form>
  );
}
