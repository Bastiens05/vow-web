"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/field";
import { formatDateTime } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/server/actions/space";
import type { MessageView } from "@/server/data";

export function MessageThread({ weddingId, messages }: { weddingId: string; messages: MessageView[] }) {
  const router = useRouter();
  const action = sendMessage.bind(null, weddingId);
  const [state, formAction, pending] = useActionState(action, {});
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const channel = supabase.channel(`messages:${weddingId}`);

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session?.access_token) {
        await supabase.realtime.setAuth(data.session.access_token);
      }
      channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `wedding_id=eq.${weddingId}` },
          () => router.refresh(),
        )
        .subscribe();
    })();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [router, weddingId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">Aucun message pour l’instant. Écrivez le premier.</p>
        ) : null}
        {messages.map((message) => (
          <article
            key={message.id}
            className={message.mine ? "ml-auto max-w-[85%] rounded-2xl bg-[#f3e6c8] px-4 py-3" : "mr-auto max-w-[85%] rounded-2xl border border-line bg-paper px-4 py-3"}
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-gold-deep">
              {message.mine ? "Vous" : message.authorName}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
            <p className="mt-2 text-[11px] text-muted">{formatDateTime(message.createdAt)}</p>
          </article>
        ))}
        <div ref={bottom} />
      </div>
      <form action={formAction} className="space-y-3">
        <label className="block text-sm">
          Message
          <TextArea name="body" required maxLength={2000} className="mt-1.5 min-h-24" placeholder="Écrire au fil du mariage…" />
        </label>
        {state.error ? <Alert>{state.error}</Alert> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer"}
        </Button>
      </form>
    </div>
  );
}
