"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateInvitationToken } from "@/lib/domain/token";
import { siteUrl } from "@/lib/env";
import { messageFromError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { sendProductEmail } from "@/server/mail";
import { notifyWedding } from "@/server/push";
import { requireSession } from "@/server/session";

async function mailAndPush(userIds: string[], title: string, body: string, path: string) {
  if (userIds.length === 0 || !body) return;
  const supabase = await createClient();
  await notifyWedding(userIds, { title, body, url: path });
  const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", userIds);
  await Promise.all(
    (profiles ?? [])
      .filter((profile) => profile.email)
      .map((profile) =>
        sendProductEmail({
          to: profile.email,
          subject: title,
          text: `${body}\n${siteUrl()}${path}`,
        }),
      ),
  );
}

export async function assignStep(formData: FormData) {
  await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const slotId = String(formData.get("slot_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");
  const previous = formData.getAll("previous_user_id").map(String);
  const supabase = await createClient();
  for (const id of previous) {
    if (id && id !== userId) await supabase.rpc("clear_timeline_step", { p_slot: slotId, p_user: id });
  }
  if (userId) await supabase.rpc("assign_timeline_step", { p_slot: slotId, p_user: userId });
  revalidatePath(`/mariage/${weddingId}/deroulement`);
  revalidatePath(`/mariage/${weddingId}/jour`);
}

export async function markReady(formData: FormData) {
  const session = await requireSession();
  const slotId = String(formData.get("slot_id") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_step_ready", { p_slot: slotId });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    redirect(`/mariage/${String(formData.get("wedding_id") ?? "")}/jour`);
  }
  const note = data as { wedding_id?: string; body?: string; user_ids?: string[] };
  const weddingId = note.wedding_id ?? "";
  const ids = Array.isArray(note.user_ids) ? note.user_ids.filter((id) => id !== session.userId) : [];
  await mailAndPush(ids, "VOW · Relais", note.body ?? "", `/mariage/${weddingId}/jour`);
  revalidatePath(`/mariage/${weddingId}/jour`);
  revalidatePath("/alertes");
}

export async function toggleRain(formData: FormData) {
  await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const active = formData.get("active") === "on";
  if (formData.get("confirm") !== "on") redirect(`/mariage/${weddingId}/pluie`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_rain_plan", { p_wedding: weddingId, p_active: active });
  if (!error && data) {
    const { data: members } = await supabase.from("wedding_members").select("user_id").eq("wedding_id", weddingId).eq("member_role", "vendor");
    const ids = (members ?? []).map((member) => member.user_id);
    await mailAndPush(ids, "VOW · Plan pluie", data, `/mariage/${weddingId}/carte`);
  }
  revalidatePath(`/mariage/${weddingId}/pluie`);
  revalidatePath(`/mariage/${weddingId}/carte`);
  revalidatePath(`/mariage/${weddingId}/jour`);
}

export async function addRainStop(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  if (label.length < 1 || address.length < 3) return { error: "Indiquez un lieu et une adresse." };
  const supabase = await createClient();
  const { error } = await supabase.from("rain_stops").insert({ wedding_id: weddingId, label, address });
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/pluie`);
  return { success: "Lieu de repli ajouté." };
}

export async function addRainSlot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const starts = String(formData.get("starts_at") ?? "");
  const place = String(formData.get("place") ?? "").trim();
  if (title.length < 1 || !/^\d{2}:\d{2}$/.test(starts)) return { error: "Indiquez un moment et une heure." };
  const supabase = await createClient();
  const { error } = await supabase.from("rain_slots").insert({ wedding_id: weddingId, title, starts_at: starts, place });
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/pluie`);
  return { success: "Étape de repli ajoutée." };
}

export async function saveNeeds(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const power = Number(formData.get("power_w") ?? 0);
  const sockets = Number(formData.get("sockets") ?? 0);
  const setup = Number(formData.get("setup_minutes") ?? 0);
  const supabase = await createClient();
  const { error } = await supabase.from("technical_needs").upsert({
    wedding_id: weddingId,
    user_id: session.userId,
    vehicle: String(formData.get("vehicle") ?? "").trim(),
    access_start: String(formData.get("access_start") ?? "") || null,
    access_end: String(formData.get("access_end") ?? "") || null,
    parking: String(formData.get("parking") ?? "").trim(),
    power_w: Number.isFinite(power) ? power : 0,
    sockets: Number.isFinite(sockets) ? sockets : 0,
    setup_minutes: Number.isFinite(setup) ? setup : 0,
    space_note: String(formData.get("space_note") ?? "").trim(),
  });
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/besoins`);
  return { success: "Besoins enregistrés." };
}

export async function saveVenueLimit(formData: FormData) {
  await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const raw = String(formData.get("power_w") ?? "").trim();
  const supabase = await createClient();
  await supabase.from("venue_limits").upsert({
    wedding_id: weddingId,
    power_w: raw ? Number(raw) : null,
    parking_note: String(formData.get("parking_note") ?? "").trim(),
  });
  revalidatePath(`/mariage/${weddingId}/besoins`);
}

export async function saveWeather(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("weather_settings").upsert({
    wedding_id: weddingId,
    enabled: formData.get("enabled") === "on",
    rain_mm: Number(formData.get("rain_mm") ?? 1),
    rain_probability: Number(formData.get("rain_probability") ?? 50),
    wind_kmh: Number(formData.get("wind_kmh") ?? 40),
  });
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/pluie`);
  return { success: "Seuils enregistrés." };
}

export async function recommendVendor(formData: FormData) {
  const session = await requireSession();
  const weddingId = String(formData.get("wedding_id") ?? "");
  const vendorId = String(formData.get("vendor_id") ?? "");
  const token = generateInvitationToken();
  const supabase = await createClient();
  const { error } = await supabase.from("recommendations").insert({
    wedding_id: weddingId,
    from_user_id: session.userId,
    vendor_id: vendorId,
    token,
  });
  if (error) redirect(`/mariage/${weddingId}`);
  revalidatePath("/espace");
  redirect(`/mariage/${weddingId}?reco=${token}`);
}
