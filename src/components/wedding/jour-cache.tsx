"use client";

import { useEffect, useState } from "react";

type CachedSlot = { startsAt: string; title: string; place: string };

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function JourCache({ weddingId, slots }: { weddingId: string; slots: CachedSlot[] }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const items = slots
      .map((slot) => `<li><strong>${escapeHtml(slot.startsAt.slice(0, 5))}</strong> ${escapeHtml(slot.title)} — ${escapeHtml(slot.place)}</li>`)
      .join("");
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jour J</title></head><body style="font-family:system-ui;margin:0;padding:24px;background:#f5f5f7;color:#111"><p>Hors ligne. Le déroulé enregistré reste lisible.</p><ul>${items}</ul></body></html>`;
    localStorage.setItem(`vow-jour-${weddingId}`, JSON.stringify(slots));
    const write = async () => {
      if ("caches" in window) {
        const cache = await caches.open("vow-jour-v1");
        await cache.put(
          `/mariage/${weddingId}/jour`,
          new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
        );
      }
      if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
    };
    void write();
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [weddingId, slots]);

  if (!offline) return null;
  return <p className="mb-4 text-sm">Hors ligne. Le déroulé enregistré reste lisible.</p>;
}
