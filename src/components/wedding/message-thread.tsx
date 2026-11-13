"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { enterSendsMessage, hasTouchKeyboard } from "@/lib/domain/composer-key";
import { formatDateTime } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/server/actions/space";
import type { MessageView } from "@/server/data";

export function MessageThread({
  weddingId,
  vendorUserId,
  messages,
  avatars = {},
}: {
  weddingId: string;
  vendorUserId: string;
  messages: MessageView[];
  avatars?: Record<string, string | null>;
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
    <div className="relative z-10 flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 pb-28 md:pb-4">
        {shown.length === 0 ? <p className="text-base text-ink">Écrivez le premier message.</p> : null}
        {shown.map((message, index) => {
          const previous = shown[index - 1];
          const seriesStart = !previous || previous.authorId !== message.authorId;
          const photo = avatars[message.authorId] ?? null;
          return (
            <article key={message.id} className={`flex max-w-[85%] items-end gap-2 ${message.mine ? "ml-auto" : "mr-auto"}`}>
              {message.mine ? null : seriesStart ? (
                photo ? (
                  <img src={photo} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-ink">
                    {initials(message.authorName)}
                  </span>
                )
              ) : (
                <span className="h-10 w-10 shrink-0" aria-hidden />
              )}
              <div>
                <div
                  className={
                    message.mine
                      ? "rounded-[24px] bg-[#1c1b19]/80 px-4 py-3 text-[#f7f3ec] backdrop-blur-md"
                      : "rounded-[24px] border border-white/70 bg-white/75 px-4 py-3 text-ink shadow-[var(--vow-shadow)] backdrop-blur-md"
                  }
                >
                  {!message.mine && seriesStart ? <p className="mb-1 text-sm font-medium text-ink">{message.authorName}</p> : null}
                  <p className="whitespace-pre-wrap text-base leading-7">{message.body}</p>
                </div>
                <p className={`mt-1 text-xs text-ink ${message.mine ? "text-right" : ""}`}>{formatDateTime(message.createdAt)}</p>
              </div>
            </article>
          );
        })}
        <div ref={bottom} />
      </div>
      <form
        action={async (formData) => {
          const body = String(formData.get("body") ?? "").trim();
          if (!body || pending) return;
          setOptimistic((current) => [
            ...current,
            { id: `local-${Date.now()}`, body, createdAt: new Date().toISOString(), authorId: "me", authorName: "Vous", mine: true },
          ]);
          await formAction(formData);
        }}
        className="fixed inset-x-3 z-30 flex items-center gap-2 rounded-full border border-white/70 bg-white/65 p-1.5 shadow-[var(--vow-shadow)] backdrop-blur-md bottom-[calc(4.25rem+env(safe-area-inset-bottom))] md:static md:z-10 md:mx-3 md:mb-3"
      >
        <label className="sr-only" htmlFor="chat-body">Message</label>
        <textarea
          id="chat-body"
          ref={bodyRef}
          name="body"
          rows={1}
          required
          placeholder="Écrire un message…"
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-4 py-2 text-base text-ink outline-none"
          onKeyDown={(event) => {
            if (
              !enterSendsMessage(
                {
                  key: event.key,
                  shiftKey: event.shiftKey,
                  isComposing: event.nativeEvent.isComposing,
                  keyCode: event.nativeEvent.keyCode,
                  repeat: event.repeat,
                },
                { touchKeyboard: hasTouchKeyboard() },
              )
            ) {
              return;
            }
            event.preventDefault();
            if (!event.currentTarget.value.trim() || pending) return;
            event.currentTarget.form?.requestSubmit();
          }}
        />
        <button
          type="submit"
          aria-label="Envoyer"
          disabled={pending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-ink disabled:opacity-50"
        >
          <Send className="h-5 w-5" aria-hidden />
        </button>
      </form>
      {state.error ? <div className="px-4 pb-3"><Alert>{state.error}</Alert></div> : null}
    </div>
  );
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "V";
}
