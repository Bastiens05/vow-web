"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/server/actions/space";
import type { MessageView } from "@/server/data";

export function MessageThread({
  weddingId,
  vendorUserId,
  messages,
}: {
  weddingId: string;
  vendorUserId: string;
  messages: MessageView[];
}) {
  const router = useRouter();
  const action = sendMessage.bind(null, weddingId, vendorUserId);
  const [state, formAction, pending] = useActionState(action, {});
  const [optimistic, setOptimistic] = useState<MessageView[]>([]);
  const bottom = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const draftKey = `vow-draft:${weddingId}:${vendorUserId}`;
  const shown = [...messages, ...optimistic.filter((item) => !messages.some((message) => message.body === item.body && message.mine))];

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [shown.length]);

  useEffect(() => {
    const stored = sessionStorage.getItem(draftKey);
    if (stored && bodyRef.current && bodyRef.current.value.trim().length === 0) {
      bodyRef.current.value = stored;
      sessionStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const channel = supabase.channel(`messages:${weddingId}:${vendorUserId}`);
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session?.access_token) await supabase.realtime.setAuth(data.session.access_token);
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
  }, [router, weddingId, vendorUserId]);

  return (
    <div className="relative flex flex-col overflow-hidden rounded-[28px]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center opacity-30 blur-2xl"
        style={{ backgroundImage: "url(/hero/venue.jpg)" }}
      />
      <div className="relative flex flex-col gap-4 px-3 py-4 pb-28 md:h-[min(70dvh,40rem)] md:overflow-y-auto md:pb-4">
        {shown.length === 0 ? <p className="text-base text-ink">Écrivez le premier message.</p> : null}
        {shown.map((message) => (
          <article key={message.id} className={`flex max-w-[85%] items-end gap-2 ${message.mine ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent bg-paper text-sm font-medium text-ink">
              {initials(message.authorName)}
            </span>
            <div>
              <div
                className={
                  message.mine
                    ? "rounded-[24px] bg-ink px-4 py-3 text-ivory"
                    : "rounded-[24px] border border-white/50 bg-white/55 px-4 py-3 text-ink shadow-[var(--vow-shadow)] backdrop-blur-md"
                }
              >
                {message.mine ? null : <p className="mb-1 text-sm font-medium text-ink">{message.authorName}</p>}
                <p className="whitespace-pre-wrap text-base leading-7">{message.body}</p>
              </div>
              <p className={`mt-1 text-xs text-ink/70 ${message.mine ? "text-right" : ""}`}>{formatDateTime(message.createdAt)}</p>
            </div>
          </article>
        ))}
        <div ref={bottom} />
      </div>
      <form
        action={async (formData) => {
          const body = String(formData.get("body") ?? "").trim();
          if (body) {
            setOptimistic((current) => [
              ...current,
              { id: `local-${Date.now()}`, body, createdAt: new Date().toISOString(), authorId: "me", authorName: "Vous", mine: true },
            ]);
          }
          await formAction(formData);
        }}
        className="fixed inset-x-0 z-30 flex items-end gap-2 border-t border-line bg-paper/95 px-3 py-3 backdrop-blur bottom-[calc(4.25rem+env(safe-area-inset-bottom))] md:static md:z-10 md:mt-3 md:border-0 md:bg-transparent md:px-3 md:py-0 md:backdrop-blur-none"
      >
        <label className="sr-only" htmlFor="chat-body">Message</label>
        <textarea
          id="chat-body"
          ref={bodyRef}
          name="body"
          rows={1}
          required
          placeholder="Message"
          className="max-h-32 min-h-12 flex-1 resize-none rounded-full border border-line bg-paper px-5 py-3 text-base text-ink outline-none focus:border-accent"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Envoyer"}
        </Button>
      </form>
      {state.error ? <Alert>{state.error}</Alert> : null}
    </div>
  );
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "V";
}
