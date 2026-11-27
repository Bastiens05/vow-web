"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import type { GoldenHour } from "@/lib/domain/solar";
import { addTimelineSlot } from "@/server/actions/space";

export function PhotoTools({
  weddingId,
  groups,
  session,
  light,
  canEdit,
}: {
  weddingId: string;
  groups: { title: string; people: string }[];
  session: { title: string; startsAt: string } | null;
  light: GoldenHour | null;
  canEdit: boolean;
}) {
  const action = addTimelineSlot.bind(null, weddingId);
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <section className="mt-8 grid gap-4 rounded-3xl border border-line bg-paper p-5">
      <h2 className="font-serif text-3xl font-normal tracking-tight">Outils photo</h2>
      <div>
        <h3 className="text-sm font-medium">Lumière dorée</h3>
        {light ? (
          <p className="mt-1 text-[13px] leading-5 text-ink">
            Matin {light.morningStart}–{light.morningEnd} · Soir {light.eveningStart}–{light.eveningEnd}
          </p>
        ) : (
          <p className="mt-1 text-[13px] leading-5 text-ink">Indiquez la date et le lieu pour calculer la lumière dorée.</p>
        )}
      </div>
      <div>
        <h3 className="text-sm font-medium">Séance couple</h3>
        {session ? (
          <p className="mt-1 text-[13px] leading-5 text-ink">
            {session.title} · {session.startsAt.slice(0, 5)}
          </p>
        ) : canEdit ? (
          <form action={formAction} className="mt-2 grid gap-3">
            <input type="hidden" name="title" value="Séance couple" />
            <input type="hidden" name="notes" value="" />
            <Field label="Heure">
              <TextInput name="starts_at" placeholder="16:30" required />
            </Field>
            <Field label="Lieu">
              <TextInput name="place" placeholder="Jardin" />
            </Field>
            <Button type="submit" disabled={pending}>
              {pending ? "Ajout…" : "Ajouter la séance couple"}
            </Button>
            {state.error ? <p className="text-[13px] text-danger">{state.error}</p> : null}
          </form>
        ) : (
          <p className="mt-1 text-[13px] leading-5 text-ink">Aucune séance couple dans le déroulé.</p>
        )}
      </div>
      <div>
        <h3 className="text-sm font-medium">Photos de groupe</h3>
        {groups.length === 0 ? (
          <p className="mt-1 text-[13px] leading-5 text-ink">Ajoutez les invités pour composer les groupes.</p>
        ) : (
          <ol className="mt-2 grid gap-2">
            {groups.map((group) => (
              <li key={group.title} className="rounded-2xl bg-ivory px-3 py-2">
                <p className="text-sm font-medium">{group.title}</p>
                <p className="text-[13px] leading-5 text-ink">{group.people}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
