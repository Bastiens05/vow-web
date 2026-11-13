"use client";

import { useState } from "react";
import { useActionState } from "react";
import { RealtimeRefresh } from "@/components/live/realtime-refresh";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { VENDOR_CATEGORIES, categoryLabel, isVendorCategory } from "@/lib/domain/categories";
import { invitationPath } from "@/lib/domain/paths";
import { siteUrl } from "@/lib/env";
import type { Tables } from "@/lib/database.types";
import { createInvitation, resendInvitation, revokeInvitation } from "@/server/actions/weddings";

export function LinkInvite({
  weddingId,
  role,
  invitations,
  title,
  intro,
  emailLabel,
  submitLabel,
  withName = false,
  withTrade = false,
  quiet = false,
}: {
  weddingId: string;
  role: "vendor" | "couple";
  invitations: Tables<"invitations">[];
  title: string;
  intro: string;
  emailLabel: string;
  submitLabel: string;
  withName?: boolean;
  withTrade?: boolean;
  quiet?: boolean;
}) {
  const [state, action, pending] = useActionState(createInvitation, {});
  const [sentEmail, setSentEmail] = useState("");
  const waiting = invitations.filter((invitation) => invitation.accepted_at === null && invitation.invited_role === role);
  const created = state.success?.match(/https?:\/\/\S+/)?.[0] ?? null;
  return (
    <section className={quiet ? "mt-8 border-t border-line pt-6" : "mt-6 rounded-3xl border border-line bg-paper p-5"}>
      <RealtimeRefresh
        channel={`invite-${weddingId}-${role}${quiet ? "-quiet" : ""}`}
        subscriptions={[
          { table: "invitations", event: "*", filter: `wedding_id=eq.${weddingId}` },
          { table: "wedding_members", event: "INSERT", filter: `wedding_id=eq.${weddingId}` },
        ]}
      />
      <h3 className={quiet ? "text-base font-medium" : "text-lg font-semibold tracking-tight"}>{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted">{intro}</p>
      <form
        action={async (formData) => {
          setSentEmail(String(formData.get("email") ?? ""));
          await action(formData);
        }}
        className="mt-4 grid gap-3"
      >
        <input type="hidden" name="wedding_id" value={weddingId} />
        <input type="hidden" name="role" value={role} />
        <Field label={emailLabel}>
          <TextInput name="email" type="email" required placeholder="prenom@exemple.fr" />
        </Field>
        {withName ? (
          <Field label="Nom" hint="Facultatif.">
            <TextInput name="invitee_name" placeholder="Atelier Lumière" />
          </Field>
        ) : null}
        {withTrade ? (
          <Field label="Métier" hint="Facultatif.">
            <SelectInput name="invitee_trade" defaultValue="">
              <option value="">À préciser</option>
              {VENDOR_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {categoryLabel(category)}
                </option>
              ))}
            </SelectInput>
          </Field>
        ) : null}
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.success ? <Alert tone="success">{state.success.replace(/https?:\/\/\S+/, "").trim()}</Alert> : null}
        {created ? <code className="block overflow-x-auto rounded-lg bg-ivory px-3 py-2 text-xs">{created}</code> : null}
        {state.success && sentEmail ? <p className="text-sm text-ink">{sentEmail}</p> : null}
        <Button type="submit" variant={quiet ? "secondary" : "primary"} disabled={pending} className="w-fit">
          {pending ? "Envoi…" : submitLabel}
        </Button>
      </form>
      <ul className="mt-5 space-y-3">
        {waiting.length === 0 ? <li className="text-sm text-muted">Aucune invitation en attente.</li> : null}
        {waiting.map((invitation) => (
          <PendingInvite key={invitation.id} weddingId={weddingId} invitation={invitation} />
        ))}
      </ul>
    </section>
  );
}

function PendingInvite({ weddingId, invitation }: { weddingId: string; invitation: Tables<"invitations"> }) {
  const [copied, setCopied] = useState(false);
  const link = `${siteUrl()}${invitationPath(invitation.token)}`;
  const trade = invitation.invitee_trade && isVendorCategory(invitation.invitee_trade) ? categoryLabel(invitation.invitee_trade) : "";
  return (
    <li className="rounded-2xl border border-line bg-ivory/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{invitation.invitee_name || invitation.email}</p>
        <Badge>En attente</Badge>
        {trade ? <Badge>{trade}</Badge> : null}
      </div>
      {invitation.invitee_name ? <p className="mt-1 text-sm text-muted">{invitation.email}</p> : null}
      <code className="mt-3 block overflow-x-auto rounded-lg bg-paper px-3 py-2 text-xs">{link}</code>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-line bg-paper px-3 py-2 text-sm"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
          }}
        >
          {copied ? "Copié" : "Copier le lien"}
        </button>
        <a
          className="rounded-full border border-line bg-paper px-3 py-2 text-sm"
          href={`mailto:${invitation.email}?subject=${encodeURIComponent("Votre espace VOW")}&body=${encodeURIComponent(`Bonjour,\n\nVotre espace est prêt :\n${link}\n`)}`}
        >
          Écrire
        </a>
        <form action={resendInvitation}>
          <input type="hidden" name="wedding_id" value={weddingId} />
          <input type="hidden" name="role" value={invitation.invited_role} />
          <input type="hidden" name="email" value={invitation.email} />
          <input type="hidden" name="invitee_name" value={invitation.invitee_name} />
          <input type="hidden" name="invitee_trade" value={invitation.invitee_trade} />
          <Button type="submit" variant="secondary">
            Renvoyer
          </Button>
        </form>
        <form action={revokeInvitation}>
          <input type="hidden" name="wedding_id" value={weddingId} />
          <input type="hidden" name="id" value={invitation.id} />
          <Button type="submit" variant="ghost">
            Annuler
          </Button>
        </form>
      </div>
    </li>
  );
}
