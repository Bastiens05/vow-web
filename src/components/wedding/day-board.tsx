"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { ProgrammeStart } from "@/components/wedding/programme-start";
import { addMinutesToTime } from "@/lib/domain/day";
import { formatSlotTime } from "@/lib/domain/format";
import type { TemplateSlot } from "@/lib/domain/timeline-templates";
import { createClient } from "@/lib/supabase/client";
import { shiftSlot, undoShift } from "@/server/actions/day";
import { assignStep, markReady } from "@/server/actions/relay";
import { addTimelineSlot, deleteTimelineSlot, updateTimelineSlot } from "@/server/actions/space";
import type { SlotView } from "@/server/data";

export function DayBoard({
  weddingId,
  slots,
  canControl,
  userId,
  vendors = [],
  suggestion = null,
}: {
  weddingId: string;
  slots: SlotView[];
  canControl: boolean;
  userId: string;
  vendors?: { userId: string; fullName: string }[];
  suggestion?: { id: string; label: string; slots: TemplateSlot[] } | null;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shiftingId, setShiftingId] = useState<string | null>(null);
  const [offerTemplate, setOfferTemplate] = useState(false);

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

  const names = new Map(vendors.map((vendor) => [vendor.userId, vendor.fullName]));

  return (
    <div className="space-y-6">
      {live.length === 0 ? <ProgrammeStart weddingId={weddingId} canApply={canControl} suggestion={suggestion} /> : null}
      {live.length > 0 && !canControl ? (
        <div>
          <button type="button" className="text-sm underline active:opacity-70" onClick={() => setOfferTemplate((value) => !value)}>
            Proposer un programme
          </button>
          {offerTemplate ? (
            <div className="mt-4">
              <ProgrammeStart weddingId={weddingId} canApply={false} suggestion={suggestion} />
            </div>
          ) : null}
        </div>
      ) : null}
      {error ? <Alert>{error}</Alert> : null}
      {live.length > 0 ? (
        <p className="text-sm text-muted">
          {live.filter((slot) => slot.ready).length}/{live.length} étapes prêtes
        </p>
      ) : null}
      {live.length > 0 ? <ol className="relative ml-1 border-l border-line">
        {live.map((slot) => {
          const concerned = slot.assigneeIds.map((id) => names.get(id)).filter((name): name is string => Boolean(name));
          const shifting = shiftingId === slot.id;
          return (
          <li key={slot.id} className="relative pb-8 pl-6">
            <span className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full bg-ink" aria-hidden />
            {canControl ? (
              <button
                type="button"
                className="block w-full text-left"
                aria-expanded={shifting}
                onClick={() => setShiftingId((current) => (current === slot.id ? null : slot.id))}
              >
                <StepSummary slot={slot} concerned={concerned} />
              </button>
            ) : (
              <StepSummary slot={slot} concerned={concerned} />
            )}
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
                <div className="mt-3 flex gap-4">
                  <button
                    type="button"
                    className="text-sm text-muted underline active:opacity-70"
                    aria-expanded={shifting}
                    onClick={() => setShiftingId((current) => (current === slot.id ? null : slot.id))}
                  >
                    Décaler
                  </button>
                  <button type="button" className="text-sm text-muted underline active:opacity-70" onClick={() => setEditingId((current) => (current === slot.id ? null : slot.id))}>
                    {editingId === slot.id ? "Fermer" : "Modifier"}
                  </button>
                </div>
                {editingId === slot.id ? (
                  <StepEditor weddingId={weddingId} slot={slot} vendors={vendors} />
                ) : null}
                {shifting ? (
                  <div className="mt-4 space-y-3">
                    <label className="flex items-center gap-2 text-sm text-muted">
                      <input type="checkbox" checked={cascade} onChange={(event) => setCascade(event.target.checked)} className="h-4 w-4 accent-ink" />
                      Décaler aussi la suite
                    </label>
                    <div className="flex flex-wrap gap-2">
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
                  </div>
                ) : null}
              </>
            ) : null}
          </li>
          );
        })}
      </ol> : null}
      {canControl ? <AddStep weddingId={weddingId} /> : null}
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

function StepSummary({ slot, concerned }: { slot: SlotView; concerned: string[] }) {
  return (
    <>
      <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatSlotTime(slot.startsAt).replace(":", "h")}</p>
      <h3 className="mt-1 text-xl font-semibold tracking-tight">{slot.title}</h3>
      {slot.place ? <p className="text-sm text-muted">{slot.place}</p> : <p className="text-sm text-muted">Lieu à préciser</p>}
      <p className="mt-2 text-sm">{concerned.length > 0 ? concerned.join(", ") : "Aucun prestataire"}</p>
    </>
  );
}

function AddStep({ weddingId }: { weddingId: string }) {
  const [state, action, pending] = useActionState(addTimelineSlot.bind(null, weddingId), {});
  return (
    <form action={action} className="grid gap-3 rounded-3xl border border-line bg-paper p-4 sm:grid-cols-2">
      <p className="text-sm font-medium sm:col-span-2">Ajouter une étape</p>
      <Field label="Étape">
        <TextInput name="title" required placeholder="Cérémonie" />
      </Field>
      <Field label="Heure">
        <TextInput name="starts_at" type="time" required />
      </Field>
      <Field label="Lieu">
        <TextInput name="place" placeholder="Jardin" />
      </Field>
      {state.error ? (
        <div className="sm:col-span-2">
          <Alert>{state.error}</Alert>
        </div>
      ) : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Ajout…" : "Ajouter l'étape"}
      </Button>
    </form>
  );
}

function StepEditor({
  weddingId,
  slot,
  vendors,
}: {
  weddingId: string;
  slot: SlotView;
  vendors: { userId: string; fullName: string }[];
}) {
  const [state, formAction, pending] = useActionState(updateTimelineSlot.bind(null, weddingId), {});
  return (
    <form action={formAction} className="mt-3 grid gap-3 rounded-2xl border border-line p-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={slot.id} />
      <input type="hidden" name="wedding_id" value={weddingId} />
      <input type="hidden" name="slot_id" value={slot.id} />
      {slot.assigneeIds.map((id) => (
        <input key={id} type="hidden" name="previous_user_id" value={id} />
      ))}
      <Field label="Étape">
        <TextInput name="title" required defaultValue={slot.title} />
      </Field>
      <Field label="Heure de l'étape">
        <TextInput name="starts_at" type="time" required defaultValue={formatSlotTime(slot.startsAt)} />
      </Field>
      <Field label="Lieu">
        <TextInput name="place" defaultValue={slot.place} />
      </Field>
      <Field label={`Prestataire pour ${slot.title}`}>
        <select
          name="user_id"
          defaultValue={slot.assigneeIds[0] ?? ""}
          aria-label={`Prestataire pour ${slot.title}`}
          className="min-h-11 w-full rounded-xl border border-line bg-ivory px-3 text-sm"
        >
          <option value="">Personne</option>
          {vendors.map((vendor) => (
            <option key={vendor.userId} value={vendor.userId}>
              {vendor.fullName}
            </option>
          ))}
        </select>
      </Field>
      <input type="hidden" name="notes" value={slot.notes} />
      {state.error ? (
        <div className="sm:col-span-2">
          <Alert>{state.error}</Alert>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Enregistrer"}
        </Button>
        <Button type="submit" variant="secondary" formAction={assignStep}>
          Attribuer
        </Button>
        <Button type="submit" variant="ghost" formAction={deleteTimelineSlot}>
          Retirer
        </Button>
      </div>
    </form>
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
        className="min-h-10 flex-1 rounded-full border border-line bg-paper px-4 text-sm"
      />
      <Button type="submit" variant="secondary" disabled={pending} className="min-h-10 px-4">
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
