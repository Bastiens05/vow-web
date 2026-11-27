"use client";

import { removeStop } from "@/server/actions/daypack";

export function RemoveStopButton({ weddingId, stopId }: { weddingId: string; stopId: string }) {
  return (
    <form action={removeStop.bind(null, weddingId, stopId)}>
      <button type="submit" className="min-h-11 text-sm text-ink underline">
        Retirer
      </button>
    </form>
  );
}
