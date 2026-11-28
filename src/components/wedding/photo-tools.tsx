"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import type { GoldenHour } from "@/lib/domain/solar";
import { acceptCoupleSession, answerCoupleCounter, composeNamedGroup, proposeCoupleSession, respondCoupleSession } from "@/server/actions/photo-session";

export function PhotoTools({
  weddingId,
  names,
  namesUnavailable,
  session,
  proposal,
  light,
  canPropose,
  canAccept,
  suggestedTime,
  fromCouple,
}: {
  weddingId: string;
  names: string[];
  namesUnavailable: boolean;
  session: { title: string; startsAt: string } | null;
  proposal: { id: string; startsAt: string; place: string } | null;
  light: GoldenHour | null;
  canPropose: boolean;
  canAccept: boolean;
  suggestedTime: string;
  fromCouple: boolean;
}) {
  const propose = proposeCoupleSession.bind(null, weddingId);
  const accept = acceptCoupleSession.bind(null, weddingId);
  const [proposalState, proposeAction, proposing] = useActionState(propose, {});
  const [acceptState, acceptAction, accepting] = useActionState(accept, {});
  const answer = answerCoupleCounter.bind(null, weddingId);
  const [answerState, answerAction, answering] = useActionState(answer, {});
  const respond = respondCoupleSession.bind(null, weddingId);
  const [respondState, respondAction, responding] = useActionState(respond, {});
  const compose = composeNamedGroup.bind(null, weddingId);
  const [groupState, groupAction, grouping] = useActionState(compose, {});
  return (
    <section className="mt-8 grid gap-4 rounded-3xl border border-line bg-paper p-5">
      <h2 className="font-serif text-3xl font-normal tracking-tight">Outils photo</h2>
      <div>
        <h3 className="text-sm font-medium">Lumière dorée</h3>
        {light ? (
          <p className="mt-1 text-sm text-muted">
            Matin {light.morningStart}–{light.morningEnd} · Soir {light.eveningStart}–{light.eveningEnd}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">Indiquez la date et le lieu pour calculer la lumière dorée.</p>
        )}
      </div>
      <div>
        <h3 className="text-sm font-medium">Séance couple</h3>
        {session ? (
          <p className="mt-1 text-sm text-muted">
            {session.title} · {session.startsAt.slice(0, 5)}
          </p>
        ) : proposal && fromCouple && canPropose ? (
          <form action={answerAction} className="mt-2 grid gap-3">
            <input type="hidden" name="suggestion_id" value={proposal.id} />
            <p className="text-sm text-muted">
              Le couple propose {proposal.startsAt.slice(0, 5)} · {proposal.place}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" name="choice" value="accept" disabled={answering}>
                Accepter
              </Button>
              <Button type="submit" name="choice" value="refuse" variant="ghost" disabled={answering}>
                Refuser
              </Button>
            </div>
            {answerState.error ? <p className="text-sm text-danger">{answerState.error}</p> : null}
            {answerState.success ? <p className="text-sm text-muted">{answerState.success}</p> : null}
          </form>
        ) : proposal && canAccept && !fromCouple ? (
          <form action={acceptAction} className="mt-2 grid gap-3">
            <input type="hidden" name="suggestion_id" value={proposal.id} />
            <p className="text-sm text-muted">
              {proposal.startsAt.slice(0, 5)} · {proposal.place}
            </p>
            <Button type="submit" disabled={accepting}>
              {accepting ? "Ajout…" : "Accepter et ajouter au planning"}
            </Button>
            {acceptState.error ? <p className="text-sm text-danger">{acceptState.error}</p> : null}
          </form>
        ) : null}
        {session ? null : proposal && fromCouple && canAccept ? (
          <p className="mt-1 text-sm text-muted">
            Autre heure envoyée au photographe · {proposal.startsAt.slice(0, 5)} · {proposal.place}
          </p>
        ) : proposal && fromCouple ? null : proposal && canAccept ? (
          <form action={respondAction} className="mt-3 grid gap-3">
            <input type="hidden" name="suggestion_id" value={proposal.id} />
            <input type="hidden" name="place" value={proposal.place} />
            <Field label="Autre heure">
              <TextInput name="starts_at" placeholder="19:00" />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" name="choice" value="counter" variant="secondary" disabled={responding}>
                Proposer cette heure
              </Button>
              <Button type="submit" name="choice" value="refuse" variant="ghost" disabled={responding}>
                Refuser
              </Button>
            </div>
            {respondState.error ? <p className="text-sm text-danger">{respondState.error}</p> : null}
            {respondState.success ? <p className="text-sm text-muted">{respondState.success}</p> : null}
          </form>
        ) : proposal ? (
          <p className="mt-1 text-sm text-muted">
            Proposition envoyée · {proposal.startsAt.slice(0, 5)} · {proposal.place}
          </p>
        ) : canPropose ? (
          <form action={proposeAction} className="mt-2 grid gap-3">
            <Field label="Heure">
              <TextInput name="starts_at" placeholder="16:30" defaultValue={suggestedTime} required />
            </Field>
            <Field label="Lieu">
              <TextInput name="place" placeholder="Jardin" required />
            </Field>
            <Button type="submit" disabled={proposing}>
              {proposing ? "Envoi…" : "Proposer au couple"}
            </Button>
            {proposalState.error ? <p className="text-sm text-danger">{proposalState.error}</p> : null}
            {proposalState.success ? <p className="text-sm text-muted">{proposalState.success}</p> : null}
          </form>
        ) : (
          <p className="mt-1 text-sm text-muted">Aucune séance couple dans le déroulé.</p>
        )}
      </div>
      {canPropose ? (
        <div>
          <h3 className="text-sm font-medium">Photos de groupe</h3>
          {namesUnavailable ? (
            <p className="mt-1 text-sm text-muted">La liste des prénoms n&apos;est pas encore ouverte.</p>
          ) : names.length === 0 ? (
            <p className="mt-1 text-sm text-muted">Aucun invité nommé pour l&apos;instant.</p>
          ) : (
            <form action={groupAction} className="mt-3 grid gap-2">
              <Field label="Titre du groupe">
                <TextInput name="title" placeholder="Famille" />
              </Field>
              <ul className="grid gap-1">
                {names.map((name, index) => (
                  <li key={`${name}-${index}`}>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="name" value={name} />
                      {name}
                    </label>
                  </li>
                ))}
              </ul>
              <Button type="submit" variant="secondary" disabled={grouping}>
                {grouping ? "Enregistrement…" : "Composer ce groupe"}
              </Button>
              {groupState.error ? <p className="text-sm text-danger">{groupState.error}</p> : null}
              {groupState.success ? <p className="text-sm text-muted">{groupState.success}</p> : null}
            </form>
          )}
        </div>
      ) : null}
    </section>
  );
}
