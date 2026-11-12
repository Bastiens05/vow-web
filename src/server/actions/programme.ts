"use server";

import { revalidatePath } from "next/cache";
import { messageFromError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { requireSession } from "@/server/session";
import { getWeddingSpace } from "@/server/data";

function parseSlots(value: unknown): { title: string; startsAt: string; place: string; notes: string }[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 40) return null;
  const slots = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const startsAt = typeof row.startsAt === "string" ? row.startsAt.trim().slice(0, 5) : "";
    const place = typeof row.place === "string" ? row.place.trim().slice(0, 120) : "";
    const notes = typeof row.notes === "string" ? row.notes.trim().slice(0, 240) : "";
    if (title.length < 1 || title.length > 120 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startsAt)) return null;
    slots.push({ title, startsAt, place, notes });
  }
  return slots;
}

function refresh(weddingId: string) {
  revalidatePath(`/mariage/${weddingId}/jour`);
  revalidatePath("/espace");
}

async function coupleOnly(weddingId: string) {
  const space = await getWeddingSpace(weddingId);
  if (!(space.role === "couple" || space.actingAsCouple)) return null;
  return space;
}

export async function duplicateRainProgramme(weddingId: string): Promise<ActionState> {
  await requireSession();
  if (!(await coupleOnly(weddingId))) return { error: "Réservé aux mariés." };
  const supabase = await createClient();
  const { data: slots, error } = await supabase
    .from("timeline_slots")
    .select("title, starts_at, place, sort_order")
    .eq("wedding_id", weddingId);
  if (error) return { error: messageFromError(error) };
  if (!slots || slots.length === 0) return { error: "Le programme est vide." };
  await supabase.from("rain_slots").delete().eq("wedding_id", weddingId);
  const inserted = await supabase.from("rain_slots").insert(
    slots.map((slot) => ({
      wedding_id: weddingId,
      title: slot.title,
      starts_at: slot.starts_at,
      place: slot.place,
      sort_order: slot.sort_order,
    })),
  );
  if (inserted.error) return { error: messageFromError(inserted.error) };
  const plan = await supabase.from("rain_plans").upsert({ wedding_id: weddingId, active: false });
  if (plan.error) return { error: messageFromError(plan.error) };
  refresh(weddingId);
  return { success: "Version mauvais temps créée." };
}

export async function chooseDayVersion(weddingId: string, active: boolean): Promise<ActionState> {
  await requireSession();
  if (!(await coupleOnly(weddingId))) return { error: "Réservé aux mariés." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_rain_plan", { p_wedding: weddingId, p_active: active });
  if (error) return { error: messageFromError(error) };
  refresh(weddingId);
  revalidatePath(`/mariage/${weddingId}/carte`);
  return { success: data || "Version enregistrée." };
}

export async function updateRainSlot(weddingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  if (!(await coupleOnly(weddingId))) return { error: "Réservé aux mariés." };
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const starts = String(formData.get("starts_at") ?? "");
  const place = String(formData.get("place") ?? "").trim();
  if (!id || title.length < 1 || !/^\d{2}:\d{2}$/.test(starts)) return { error: "Indiquez un moment et une heure." };
  const supabase = await createClient();
  const { error } = await supabase.from("rain_slots").update({ title, starts_at: starts, place }).eq("id", id).eq("wedding_id", weddingId);
  if (error) return { error: messageFromError(error) };
  refresh(weddingId);
  return { success: "Étape mise à jour." };
}

export async function resetProgramme(weddingId: string): Promise<ActionState & { noteId?: string }> {
  await requireSession();
  if (!(await coupleOnly(weddingId))) return { error: "Réservé aux mariés." };
  const supabase = await createClient();
  const { error } = await supabase.from("timeline_slots").delete().eq("wedding_id", weddingId);
  if (error) return { error: messageFromError(error) };
  const note = await supabase.rpc("note_couple_change", {
    p_wedding: weddingId,
    p_body: "Le programme du jour a été retiré.",
  });
  refresh(weddingId);
  return { success: "Programme retiré.", noteId: note.data ?? undefined };
}

export async function restoreProgramme(weddingId: string, rawSlots: string, noteId: string): Promise<ActionState> {
  const session = await requireSession();
  if (!(await coupleOnly(weddingId))) return { error: "Réservé aux mariés." };
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(rawSlots);
  } catch {
    return { error: "Le programme n'a pas pu être rétabli." };
  }
  const slots = parseSlots(parsed);
  if (!slots) return { error: "Le programme n'a pas pu être rétabli." };
  const supabase = await createClient();
  const { error } = await supabase.from("timeline_slots").insert(
    slots.map((slot, index) => ({
      wedding_id: weddingId,
      title: slot.title,
      starts_at: slot.startsAt,
      place: slot.place,
      notes: slot.notes,
      sort_order: index + 1,
      created_by: session.userId,
    })),
  );
  if (error) return { error: messageFromError(error) };
  if (noteId) await supabase.rpc("retract_couple_note", { p_id: noteId });
  refresh(weddingId);
  return { success: "Programme rétabli." };
}
