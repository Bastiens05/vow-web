"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { assistantFailureMessage } from "@/lib/domain/assistant";
import { formatEuros } from "@/lib/domain/money";
import { applyBudgetSplit, applyProposedProgramme, applySuggestedChecklist } from "@/server/actions/assistant";

const COUPLE_PROMPTS = [
  "Que reste-t-il à faire ?",
  "Propose un programme pour le jour J",
  "Suggère une répartition du budget",
  "Aide-moi à écrire à un prestataire",
];

const VENDOR_PROMPTS = ["Résume ce mariage", "Propose un questionnaire pour mon métier", "Aide-moi à répondre au couple"];

export function AssistantDock({ role, defaultWeddingId }: { role: "couple" | "vendor"; defaultWeddingId: string | null }) {
  const path = usePathname() ?? "";
  const weddingId = /^\/mariage\/([^/]+)/.exec(path)?.[1] ?? defaultWeddingId;
  const [open, setOpen] = useState(false);
  const prompts = role === "couple" ? COUPLE_PROMPTS : VENDOR_PROMPTS;
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/assistant", body: { weddingId } }),
    [weddingId],
  );
  const { messages, sendMessage, status, error, setMessages } = useChat({ transport });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function ask(text: string) {
    const next = text.trim();
    if (!next || busy) return;
    setInput("");
    void sendMessage({ text: next });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Assistant VOW"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-lg transition hover:bg-ink/[0.05] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <span aria-hidden>✨</span>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Assistant VOW"
          className="pointer-events-auto fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-3xl border border-line bg-paper shadow-lg md:inset-auto md:bottom-6 md:right-6 md:h-[32rem] md:w-[24rem] md:rounded-3xl"
        >
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-medium">Assistant VOW</p>
              <p className="text-xs text-muted">Rien n&apos;est envoyé ni enregistré sans vous.</p>
            </div>
            <button type="button" className="min-h-11 px-2 text-sm" onClick={() => setOpen(false)}>
              Fermer
            </button>
          </header>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <div className="flex flex-wrap gap-2">
                {prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="min-h-11 rounded-full border border-line px-3 text-left text-sm"
                    onClick={() => ask(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}
            {messages.map((message) => (
              <article key={message.id} className={message.role === "user" ? "ml-8" : "mr-4"}>
                <p className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === "user" ? "bg-ink text-ivory" : "bg-mist"}`}>
                  {textOf(message)}
                </p>
                <ToolCards message={message} />
              </article>
            ))}
            {busy ? <p className="text-sm text-muted">Un instant…</p> : null}
            {error ? <p className="text-sm">{assistantFailureMessage(error)}</p> : null}
            {messages.length > 0 ? (
              <button type="button" className="text-xs text-muted underline" onClick={() => setMessages([])}>
                Effacer cette conversation
              </button>
            ) : null}
          </div>
          <form
            className="flex items-end gap-2 border-t border-line p-3"
            onSubmit={(event) => {
              event.preventDefault();
              ask(input);
            }}
          >
            <label className="sr-only" htmlFor="assistant-input">
              Message
            </label>
            <textarea
              id="assistant-input"
              value={input}
              rows={1}
              placeholder="Votre question"
              className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  ask(input);
                }
              }}
            />
            <Button type="submit" disabled={busy || input.trim().length === 0}>
              Envoyer
            </Button>
          </form>
        </div>
      ) : null}
    </>
  );
}

function textOf(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function toolOutputs(message: UIMessage): unknown[] {
  return message.parts.flatMap((part) => {
    const row = part as { type: string; state?: string; output?: unknown };
    return row.type.startsWith("tool-") && row.state === "output-available" ? [row.output] : [];
  });
}

function ToolCards({ message }: { message: UIMessage }) {
  return (
    <div className="mt-2 grid gap-2">
      {toolOutputs(message).map((output, index) => (
        <ToolCard key={index} output={output} />
      ))}
    </div>
  );
}

function ToolCard({ output }: { output: unknown }) {
  const router = useRouter();
  if (!output || typeof output !== "object") return null;
  const row = output as Record<string, unknown>;
  const weddingId = typeof row.weddingId === "string" ? row.weddingId : "";
  if (row.kind === "programme" && Array.isArray(row.slots)) {
    const slots = row.slots as { title: string; startsAt: string; place?: string }[];
    return (
      <form action={applyProposedProgramme} className="rounded-2xl border border-line p-3 text-sm">
        <p className="font-medium">Programme proposé</p>
        <ol className="mt-2 space-y-1">
          {slots.map((slot) => (
            <li key={`${slot.startsAt}-${slot.title}`}>
              {slot.startsAt} · {slot.title}
              {slot.place ? ` · ${slot.place}` : ""}
            </li>
          ))}
        </ol>
        <input type="hidden" name="confirm" value="yes" />
        <input type="hidden" name="wedding_id" value={weddingId} />
        <input type="hidden" name="slots" value={JSON.stringify(slots)} />
        <div className="mt-3 flex flex-wrap gap-2">
          {row.hasSteps ? (
            <>
              <Button type="submit" name="mode" value="add" variant="secondary">
                Ajouter
              </Button>
              <Button type="submit" name="mode" value="replace" variant="secondary">
                Remplacer
              </Button>
            </>
          ) : (
            <Button type="submit" name="mode" value="add" variant="secondary">
              Utiliser ce programme
            </Button>
          )}
        </div>
      </form>
    );
  }
  if (row.kind === "draft" && typeof row.text === "string" && typeof row.vendorUserId === "string") {
    const href = `/mariage/${weddingId}/messages?avec=${row.vendorUserId}`;
    return (
      <div className="rounded-2xl border border-line p-3 text-sm">
        <p className="font-medium">Brouillon{typeof row.vendorName === "string" ? ` · ${row.vendorName}` : ""}</p>
        <p className="mt-2 whitespace-pre-wrap leading-6">{row.text}</p>
        <p className="mt-2 text-xs text-muted">Rien n&apos;est envoyé tant que vous n&apos;appuyez pas sur Envoyer.</p>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          onClick={() => {
            sessionStorage.setItem(`vow-draft:${weddingId}:${row.vendorUserId}`, row.text as string);
            router.push(href);
          }}
        >
          Relire dans Messages
        </Button>
      </div>
    );
  }
  if (row.kind === "budget" && Array.isArray(row.lines)) {
    const total = typeof row.totalCents === "number" ? row.totalCents : 0;
    const lines = row.lines as { label: string; percent: number; cents: number }[];
    return (
      <form action={applyBudgetSplit} className="rounded-2xl border border-line p-3 text-sm">
        <p className="font-medium">Répartition suggérée</p>
        <ul className="mt-2 space-y-1">
          {lines.map((line) => (
            <li key={line.label} className="flex justify-between gap-3">
              <span>
                {line.label} · {line.percent} %
              </span>
              <span>{total > 0 ? formatEuros(line.cents) : "—"}</span>
            </li>
          ))}
        </ul>
        {total > 0 ? (
          <>
            <input type="hidden" name="confirm" value="yes" />
            <input type="hidden" name="wedding_id" value={weddingId} />
            <input type="hidden" name="total_cents" value={String(total)} />
            <Button type="submit" variant="secondary" className="mt-3">
              Enregistrer cette répartition
            </Button>
          </>
        ) : (
          <p className="mt-2 text-xs text-muted">Indiquez d&apos;abord un budget global.</p>
        )}
      </form>
    );
  }
  if (row.kind === "checklist" && Array.isArray(row.prompts)) {
    const prompts = row.prompts.filter((prompt): prompt is string => typeof prompt === "string");
    return (
      <form action={applySuggestedChecklist} className="rounded-2xl border border-line p-3 text-sm">
        <p className="font-medium">{typeof row.title === "string" ? row.title : "Questionnaire"}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          {prompts.map((prompt) => (
            <li key={prompt}>{prompt}</li>
          ))}
        </ol>
        <input type="hidden" name="confirm" value="yes" />
        <input type="hidden" name="wedding_id" value={weddingId} />
        <input type="hidden" name="prompts" value={prompts.join("\n")} />
        <Button type="submit" variant="secondary" className="mt-3">
          Créer ce questionnaire
        </Button>
      </form>
    );
  }
  if (row.kind === "todo" && Array.isArray(row.items)) {
    const items = row.items as { id: string; label: string; href: string }[];
    if (items.length === 0) return <p className="text-sm text-muted">Rien d&apos;ouvert pour le moment.</p>;
    return (
      <ul className="rounded-2xl border border-line p-3 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <a className="inline-flex min-h-11 items-center underline" href={item.href}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    );
  }
  return null;
}
