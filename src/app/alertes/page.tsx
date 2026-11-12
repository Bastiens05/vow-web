import type { Metadata } from "next";
import Link from "next/link";
import { GrantOfferCard } from "@/components/alerts/grant-offer-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/page-header";
import { RealtimeRefresh } from "@/components/live/realtime-refresh";
import { markAlertsRead } from "@/server/actions/day";
import { formatDateTime } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  await requireSession();
  return { title: "Nouveautés" };
}

export default async function AlertsPage() {
  const session = await requireSession();
  const couple = session.profile.role === "couple";
  const supabase = await createClient();
  const [{ data }, { data: offers }] = await Promise.all([
    supabase
      .from("wedding_notifications")
      .select("id, body, created_at, wedding_id, author_id, kind")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("grant_notices").select("id, grant_id, body, created_at, activated_at").order("created_at", { ascending: false }).limit(20),
  ]);
  await markAlertsRead();
  const notes = data ?? [];
  const notices = offers ?? [];
  return (
    <div className="mx-auto w-full max-w-lg px-5 py-8">
      <RealtimeRefresh
        channel="alertes-live"
        subscriptions={[
          { table: "wedding_notifications", event: "INSERT" },
          { table: "grant_notices", event: "*" },
        ]}
      />
      <h1 className="text-4xl font-semibold tracking-tight">Nouveautés</h1>
      <p className="mt-2 text-sm text-muted">
        {couple ? "Les dernières nouvelles de votre mariage." : "Vos offres à activer, et ce qui a bougé sur vos mariages."}
      </p>
      <ul className="mt-6 space-y-3">
        {notices.map((notice) => (
          <GrantOfferCard key={notice.id} grantId={notice.grant_id} body={notice.body} activated={Boolean(notice.activated_at)} />
        ))}
        {notes.length === 0 && notices.length === 0 ? (
          <li>
            <EmptyState title="Tout est à jour">
              {couple ? null : <ButtonLink href="/espace">Retour à l&apos;accueil</ButtonLink>}
            </EmptyState>
          </li>
        ) : null}
        {notes.map((note) => (
          <li key={note.id} className="rounded-2xl border border-line bg-paper px-4 py-4">
            <p className="text-sm leading-6">{couple ? coupleNote(note.kind, note.body, note.author_id === session.userId) : note.body}</p>
            <p className="mt-2 text-xs text-muted">
              {formatDateTime(note.created_at)}
              {note.author_id === session.userId ? " · vous" : ""}
            </p>
            <Link
              href={note.kind === "reminder" ? `/mariage/${note.wedding_id}` : `/mariage/${note.wedding_id}/jour`}
              className="mt-2 inline-flex min-h-11 items-center text-sm underline"
            >
              {note.kind === "reminder" ? "Ouvrir le mariage" : "Ouvrir le Jour J"}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function coupleNote(kind: string, body: string, mine: boolean) {
  if (kind === "shift" && mine) return "Vos prestataires ont été prévenus du nouvel horaire.";
  if (kind === "shift") return body.replace(/alerte/gi, "nouvelle");
  if (kind === "alert") return body.replace(/^Alerte\s*:\s*/i, "").replace(/alerte/gi, "nouvelle");
  return body.replace(/alerte/gi, "nouvelle");
}
