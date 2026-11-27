"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import type { GoldenHour } from "@/lib/domain/solar";
import { acceptCoupleSession, proposeCoupleSession } from "@/server/actions/photo-session";

export function PhotoTools({
  weddingId,
  names,
  namesUnavailable,
  session,
  proposal,
  light,
  canPropose,
  canAccept,
}: {
  weddingId: string;
  names: string[];
  namesUnavailable: boolean;
  session: { title: string; startsAt: string } | null;
  proposal: { id: string; startsAt: string; place: string } | null;
  light: GoldenHour | null;
  canPropose: boolean;
  canAccept: boolean;
}) {
  const propose = proposeCoupleSession.bind(null, weddingId);
  const accept = acceptCoupleSession.bind(null, weddingId);
  const [proposalState, proposeAction, proposing] = useActionState(propose, {});
  const [acceptState, acceptAction, accepting] = useActionState(accept, {});
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
        ) : proposal && canAccept ? (
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
        ) : proposal ? (
          <p className="mt-1 text-sm text-muted">
            Proposition envoyée · {proposal.startsAt.slice(0, 5)} · {proposal.place}
          </p>
        ) : canPropose ? (
          <form action={proposeAction} className="mt-2 grid gap-3">
            <Field label="Heure">
              <TextInput name="starts_at" placeholder="16:30" required />
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
            <ul className="mt-2 grid gap-1">
              {names.map((name, index) => (
                <li key={`${name}-${index}`} className="text-sm">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
