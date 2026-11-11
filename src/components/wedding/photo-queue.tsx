"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { callNextGroup } from "@/server/actions/photo-call";

export function PhotoQueue({
  weddingId,
  canCall,
  groups,
}: {
  weddingId: string;
  canCall: boolean;
  groups: { id: string; title: string; place: string; called: boolean }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = groups.find((group) => !group.called);
  return (
    <section className="mt-8 rounded-3xl border border-line bg-paper p-4">
      <h3 className="text-lg font-semibold">Photos de groupe</h3>
      <p className="mt-1 text-sm text-muted">Le SMS ne part pas. Le texte est prêt pour plus tard.</p>
      <ol className="mt-3 grid gap-2">
        {groups.map((group) => (
          <li key={group.id} className={`rounded-2xl px-3 py-2 text-sm ${group.id === current?.id ? "bg-ink text-ivory" : ""}`}>
            <span className="font-medium">{group.title}</span>
            {group.place ? <span className="ml-2 opacity-80">{group.place}</span> : null}
            {group.called ? <span className="ml-2 text-xs">passé</span> : null}
          </li>
        ))}
      </ol>
      {canCall ? (
        <button
          type="button"
          className="mt-3 min-h-11 rounded-full border border-line px-4 text-sm"
          onClick={() => {
            void callNextGroup(weddingId).then((result) => {
              setError(result.error ?? null);
              setMessage(result.message ?? null);
              router.refresh();
            });
          }}
        >
          Suivant
        </button>
      ) : null}
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </section>
  );
}
