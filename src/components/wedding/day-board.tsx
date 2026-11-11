"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { addMinutesToTime } from "@/lib/domain/day";
import { formatSlotTime } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/client";
import { shiftSlot, undoShift } from "@/server/actions/day";
import { markReady } from "@/server/actions/relay";
import type { SlotView } from "@/server/data";

export function DayBoard({
  weddingId,
  slots,
  canControl,
  userId,
}: {
  weddingId: string;
  slots: SlotView[];
  canControl: boolean;
  userId: string;
}) {
  const router = useRouter();
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const live = slots.map((slot) => (overrides[slot.id] ? { ...slot, startsAt: overrides[slot.id] ?? slot.startsAt } : slot));
  const [cascade, setCascade] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<{
    slotId: string;
    previous: string;
    notificationId: string;
    minutes: number;
    cascade: boolean;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const channel = supabase.channel(`day:${weddingId}`);
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session?.access_token) await supabase.realtime.setAuth(data.session.access_token);
      channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "timeline_slots", filter: `wedding_id=eq.${weddingId}` },
          () => router.refresh(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "timeline_ready", filter: `wedding_id=eq.${weddingId}` },
          () => router.refresh(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rain_plans", filter: `wedding_id=eq.${weddingId}` },
          () => router.refresh(),
        )
        .subscribe();
    })();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [router, weddingId]);

  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(() => setUndo(null), 5000);
    return () => window.clearTimeout(timer);
  }, [undo]);

  async function move(slot: SlotView, minutes: number) {
    const next = addMinutesToTime(slot.startsAt, minutes);
    setError(null);
    setPendingId(slot.id);
    setOverrides((current) => {
      const nextOverrides = { ...current, [slot.id]: next };
      if (cascade) {
        for (const item of slots) {
          if (item.startsAt > slot.startsAt) nextOverrides[item.id] = addMinutesToTime(item.startsAt, minutes);
        }
      }
      return nextOverrides;
    });
    const formData = new FormData();
    formData.set("slot_id", slot.id);
    formData.set("new_time", next);
    if (cascade) formData.set("cascade", "on");
    const result = await shiftSlot(weddingId, {}, formData);
    setPendingId(null);
    if (result.error) {
      setError(result.error);
      setOverrides({});
    } else if (result.notificationId) {
      setUndo({ slotId: slot.id, previous: slot.startsAt.slice(0, 5), notificationId: result.notificationId, minutes, cascade });
    }
    router.refresh();
  }

  async function cancelShift() {
    if (!undo) return;
    const current = undo;
    setUndo(null);
    const result = await undoShift({ weddingId, ...current, previousTime: current.previous });
    if (result.error) setError(result.error);
    setOverrides({});
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {canControl ? (
        <label className="flex min-h-12 items-center gap-3 text-sm">
          <input type="checkbox" checked={cascade} onChange={(event) => setCascade(event.target.checked)} className="h-4 w-4 accent-ink" />
          Décaler aussi la suite
        </label>
      ) : (
        <p className="rounded-2xl bg-paper px-4 py-3 text-sm leading-6">
          Le couple met à jour les horaires. Vous voyez le déroulé en direct et recevez les alertes.
        </p>
      )}
      {error ? <Alert>{error}</Alert> : null}
      <p className="text-sm text-muted">
        {live.filter((slot) => slot.ready).length}/{live.length} étapes prêtes
      </p>
      <ol className="space-y-4">
        {live.map((slot) => (
          <li key={slot.id} className="rounded-3xl border border-line bg-paper p-5">
            <p className="text-4xl font-semibold tracking-tight">{formatSlotTime(slot.startsAt).replace(":", "h")}</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">{slot.title}</h2>
            {slot.place ? <p className="text-sm text-muted">{slot.place}</p> : null}
            {slot.ready ? (
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted">
                <span className="h-2 w-2 rounded-full bg-ok" aria-hidden />
                Prêt
              </p>
            ) : null}
            {!canControl && slot.assigneeIds.includes(userId) && !slot.ready ? (
              <form action={markReady} className="mt-4">
                <input type="hidden" name="slot_id" value={slot.id} />
                <input type="hidden" name="wedding_id" value={weddingId} />
                <Button type="submit" className="min-h-14 w-full">
                  C&apos;est prêt
                </Button>
              </form>
            ) : null}
            {canControl ? (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[5, 15, 30, 60].map((minutes) => (
                    <Button
                      key={minutes}
                      type="button"
                      variant="secondary"
                      disabled={pendingId === slot.id}
                      onClick={() => move(slot, minutes)}
                      className="min-h-10 px-3"
                    >
                      {pendingId === slot.id ? "…" : `+${minutes} min`}
                    </Button>
                  ))}
                </div>
                <TimePick weddingId={weddingId} slot={slot} cascade={cascade} onError={setError} />
              </>
            ) : null}
          </li>
        ))}
      </ol>
      {undo ? (
        <div role="status" className="fixed bottom-28 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#2c2c2e] px-4 py-2 text-sm text-white shadow-lg">
          Prestataires prévenus
          <button type="button" className="font-medium underline active:opacity-70" onClick={() => void cancelShift()}>
            Annuler
          </button>
        </div>
      ) : null}
      {canControl ? <PushToggle /> : null}
    </div>
  );
}

function TimePick({
  weddingId,
  slot,
  cascade,
  onError,
}: {
  weddingId: string;
  slot: SlotView;
  cascade: boolean;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        form.set("slot_id", slot.id);
        if (cascade) form.set("cascade", "on");
        setPending(true);
        const result = await shiftSlot(weddingId, {}, form);
        setPending(false);
        if (result.error) onError(result.error);
        router.refresh();
      }}
    >
      <input
        type="time"
        name="new_time"
        required
        aria-label={`Nouvel horaire pour ${slot.title}`}
        className="min-h-14 flex-1 rounded-full border border-line bg-ivory px-4 text-base"
      />
      <Button type="submit" variant="secondary" disabled={pending} className="min-h-14">
        {pending ? "…" : "Heure"}
      </Button>
    </form>
  );
}

function PushToggle() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [status, setStatus] = useState<string | null>(null);
  const ios = useSyncExternalStore(
    () => () => {},
    () => {
      const apple = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
      return apple && !standalone;
    },
    () => false,
  );
  if (!key) {
    return (
      <p className="text-sm text-muted">
        Les alertes s’affichent dans VOW. Les notifications du téléphone s’activent quand les clés push sont configurées.
      </p>
    );
  }
  return (
    <div>
      {ios ? (
        <p className="mb-3 text-sm leading-6 text-muted">
          Sur iPhone, ajoutez VOW à l&apos;écran d&apos;accueil : Partager, puis Sur l&apos;écran d&apos;accueil. Les notifications n&apos;arrivent qu&apos;ensuite.
        </p>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        className="w-full min-h-14"
        onClick={async () => {
          if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            setStatus("Ce navigateur ne reçoit pas les notifications.");
            return;
          }
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            setStatus("Notifications refusées. Le fil VOW reste actif.");
            return;
          }
          const registration = await navigator.serviceWorker.register("/sw.js");
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: toBytes(key),
          });
          const json = subscription.toJSON();
          const response = await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(json),
          });
          setStatus(response.ok ? "Alertes activées sur cet appareil." : "Activation impossible pour le moment.");
        }}
      >
        Activer les alertes sur cet appareil
      </Button>
      {status ? <p className="mt-2 text-sm text-muted">{status}</p> : null}
    </div>
  );
}

function toBytes(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}
