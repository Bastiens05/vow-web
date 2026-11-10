"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { invitationPath } from "@/lib/domain/paths";
import { siteUrl } from "@/lib/env";
import { createInvitation, revokeInvitation } from "@/server/actions/weddings";
import type { Tables } from "@/lib/database.types";

export function InvitePanel({
  weddingId,
  invitations,
}: {
  weddingId: string;
  invitations: Tables<"invitations">[];
}) {
  const [state, action, pending] = useActionState(createInvitation, {});
  return (
    <div className="space-y-8">
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="wedding_id" value={weddingId} />
        <Field label="E-mail du destinataire">
          <TextInput name="email" type="email" required placeholder="couple@exemple.fr" />
        </Field>
        <Field label="Rôle">
          <SelectInput name="role" defaultValue="couple">
            <option value="couple">Couple</option>
            <option value="vendor">Prestataire</option>
          </SelectInput>
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
          {pending ? "Création…" : "Créer l'invitation"}
        </Button>
      </form>
      <ul className="space-y-3">
        {invitations.length === 0 ? <li className="text-sm text-muted">Aucune invitation pour le moment.</li> : null}
        {invitations.map((invitation) => (
          <InvitationRow key={invitation.id} weddingId={weddingId} invitation={invitation} />
        ))}
      </ul>
    </div>
  );
}

function InvitationRow({
  weddingId,
  invitation,
}: {
  weddingId: string;
  invitation: Tables<"invitations">;
}) {
  const [copied, setCopied] = useState(false);
  const link = `${siteUrl()}${invitationPath(invitation.token)}`;
  const pending = invitation.accepted_at === null;
  return (
    <li className="rounded-2xl border border-line bg-paper p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{invitation.email}</p>
        <Badge>{invitation.invited_role === "vendor" ? "Prestataire" : "Couple"}</Badge>
        <Badge>{pending ? "En attente" : "Acceptée"}</Badge>
      </div>
      {pending ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="block flex-1 overflow-x-auto rounded-lg bg-ivory px-3 py-2 text-xs">{link}</code>
          <button
            type="button"
            className="rounded-full border border-line px-3 py-2 text-sm"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            }}
          >
            {copied ? "Copié" : "Copier le lien"}
          </button>
          <a
            className="rounded-full border border-line px-3 py-2 text-center text-sm"
            href={`mailto:${invitation.email}?subject=${encodeURIComponent("Votre espace mariage VOW")}&body=${encodeURIComponent(`Bonjour,\n\nRejoignez votre espace mariage :\n${link}\n`)}`}
          >
            Ouvrir le courriel
          </a>
          <form action={revokeInvitation}>
            <input type="hidden" name="wedding_id" value={weddingId} />
            <input type="hidden" name="id" value={invitation.id} />
            <Button type="submit" variant="ghost">
              Retirer
            </Button>
          </form>
        </div>
      ) : null}
    </li>
  );
}
