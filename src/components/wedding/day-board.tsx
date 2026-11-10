"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { addMinutesToTime } from "@/lib/domain/day";
import { formatSlotTime } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/client";
import { sendDayAlert, shiftSlot } from "@/server/actions/day";
import type { SlotView } from "@/server/data";

export function DayBoard({ weddingId, slots }: { weddingId: string; slots: SlotView[] }) {
  const router = useRouter();
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const live = slots.map((slot) => (overrides[slot.id] ? { ...slot, startsAt: overrides[slot.id] ?? slot.startsAt } : slot));
  const [cascade, setCascade] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alertAction = sendDayAlert.bind(null, weddingId);
  const [alertState, alertForm, alertPending] = useActionState(alertAction, {});

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
        .subscribe();
    })();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [router, weddingId]);

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
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <label className="flex min-h-12 items-center gap-3 text-sm">
        <input type="checkbox" checked={cascade} onChange={(event) => setCascade(event.target.checked)} className="h-5 w-5" />
        Décaler aussi les moments suivants
      </label>
      {error ? <Alert>{error}</Alert> : null}
      <ol className="space-y-4">
        {live.map((slot) => (
          <li key={slot.id} className="rounded-3xl bg-paper p-4">
            <p className="text-4xl font-semibold tracking-tight">{formatSlotTime(slot.startsAt).replace(":", "h")}</p>
            <h2 className="mt-1 text-xl font-semibold">{slot.title}</h2>
            {slot.place ? <p className="text-sm text-muted">{slot.place}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button type="button" disabled={pendingId === slot.id} onClick={() => move(slot, 15)} className="min-h-14">
                {pendingId === slot.id ? "…" : "+15 min"}
              </Button>
              <Button type="button" disabled={pendingId === slot.id} onClick={() => move(slot, 30)} className="min-h-14">
                {pendingId === slot.id ? "…" : "+30 min"}
              </Button>
            </div>
            <TimePick weddingId={weddingId} slot={slot} cascade={cascade} onError={setError} />
          </li>
        ))}
      </ol>
      <form action={alertForm} className="rounded-3xl bg-paper p-4">
        <label className="block text-sm font-medium">
          Prévenir les prestataires
          <textarea
            name="message"
            required
            maxLength={240}
            placeholder="Le cocktail prend 20 minutes de plus."
            className="mt-2 min-h-24 w-full rounded-2xl border border-line bg-ivory px-3 py-3 text-base"
          />
        </label>
        {alertState.error ? (
          <div className="mt-3">
            <Alert>{alertState.error}</Alert>
          </div>
        ) : null}
        {alertState.success ? (
          <div className="mt-3">
            <Alert tone="success">{alertState.success}</Alert>
          </div>
        ) : null}
        <Button type="submit" disabled={alertPending} className="mt-3 w-full min-h-14" aria-busy={alertPending}>
          {alertPending ? "Envoi…" : "Envoyer l’alerte"}
        </Button>
      </form>
      <PushToggle />
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
  if (!key) {
    return (
      <p className="text-sm text-muted">
        Les alertes s’affichent dans VOW. Les notifications du téléphone s’activent quand les clés push sont configurées.
      </p>
    );
  }
  return (
    <div>
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
