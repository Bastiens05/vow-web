import type { Metadata } from "next";
import Link from "next/link";
import { RealtimeRefresh } from "@/components/live/realtime-refresh";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { listInbox } from "@/server/data";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Messages" };

export default async function InboxPage() {
  const session = await requireSession();
  const threads = await listInbox(session.userId);
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8">
      <RealtimeRefresh
        channel="inbox-messages"
        subscriptions={[
          { table: "messages", event: "INSERT" },
          { table: "message_reads", event: "INSERT" },
        ]}
      />
      <PageHeader
        eyebrow="Tous les mariages"
        title="Messages"
        description="Le dernier message de chaque mariage."
      />
      {threads.length === 0 ? (
        <EmptyState title="Aucune conversation">
          <ButtonLink href="/mariages">Ouvrir un mariage</ButtonLink>
        </EmptyState>
      ) : null}
      <ul className="space-y-3">
        {threads.map((thread) => (
          <li key={thread.weddingId}>
            <Link href={`/mariage/${thread.weddingId}/messages`}>
              <Card className="transition active:scale-[0.99]">
                <p className="flex items-center gap-2 font-semibold tracking-tight">
                  {thread.title}
                  {thread.unread ? <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-label="Non lu" /> : null}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{thread.body}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
