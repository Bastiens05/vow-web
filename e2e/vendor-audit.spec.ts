import { readFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { revealPasswordLogin } from "./password-auth";

const password = "DemoVow2026!";
const weddingId = "44444444-4444-4444-8444-444444444444";
const music = "Ouverture La vie en rose, puis un slow.";

const trades = [
  { email: "camille@demo.vow.test", heading: "Groupes photo", sees: "Famille de Léa", hidden: "Sans gluten" },
  { email: "video@demo.vow.test", heading: "Groupes photo", sees: "Famille de Léa", hidden: "Sans gluten" },
  { email: "nina@demo.vow.test", heading: "Tables et régimes", sees: "Claire Dupont", hidden: "Famille de Léa" },
  { email: "lieu@demo.vow.test", heading: "Tables et régimes", sees: "Claire Dupont", hidden: "Famille de Léa" },
  { email: "dj@demo.vow.test", heading: "Musique", sees: music, hidden: "Famille de Léa" },
  { email: "fleurs@demo.vow.test", heading: "Infos du lieu", sees: "Léognan", hidden: music },
  { email: "planner@demo.vow.test", heading: "Infos pratiques", sees: music, hidden: "" },
  { email: "beaute@demo.vow.test", heading: "Infos du lieu", sees: "Léognan", hidden: music },
  { email: "officiant@demo.vow.test", heading: "Infos du lieu", sees: "Léognan", hidden: music },
];

test("le couple alimente chaque métier, et seulement le sien", async ({ browser }) => {
  const couplePage = await freshPage(browser);
  await login(couplePage, "lea@demo.vow.test");
  await couplePage.goto(`/mariage/${weddingId}/pratique`);
  await couplePage.getByLabel("Musique").fill(music);
  await couplePage.getByRole("button", { name: "Enregistrer la musique" }).click();
  await expect(couplePage.getByText("Musique enregistrée.")).toBeVisible();
  await couplePage.goto(`/mariage/${weddingId}/jour`);
  await expect(couplePage.getByRole("heading", { name: "Cérémonie" })).toBeVisible();
  await expect(couplePage.getByRole("button", { name: "Décaler", exact: true }).first()).toBeVisible();

  for (const trade of trades) {
    const page = await freshPage(browser);
    await login(page, trade.email);
    await expect(page.getByText(/J-\d+/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Nouveautés" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Alertes" })).toHaveCount(0);
    await expect(page.getByText(/\bbulle\b/i)).toHaveCount(0);
    await page.goto(`/mariage/${weddingId}`);
    await expect(page.getByText(/J-\d+/).first()).toBeVisible();
    await page.goto(`/mariage/${weddingId}/jour`);
    await expect(page.getByRole("button", { name: "Décaler", exact: true })).toHaveCount(0);
    await expect(page.getByText("tenu par les mariés")).toBeVisible();
    await page.goto(`/mariage/${weddingId}/pratique`);
    await expect(page.getByRole("heading", { name: trade.heading }).first()).toBeVisible();
    if (trade.heading === "Musique" || trade.heading === "Infos pratiques") {
      await expect(page.getByLabel("Musique")).toHaveValue(new RegExp(music.slice(0, 12)));
    }
    if (trade.heading === "Infos du lieu") {
      await expect(page.getByLabel("Adresse de la cérémonie")).toHaveValue(/Léognan/);
      await expect(page.getByLabel("Musique")).toHaveCount(0);
    }
    if (trade.sees && trade.heading !== "Musique" && trade.heading !== "Infos pratiques" && trade.heading !== "Infos du lieu") {
      await expect(page.getByText(trade.sees).first()).toBeVisible();
    }
    if (trade.hidden) await expect(page.getByText(trade.hidden)).toHaveCount(0);
    await page.context().close();
  }

  const couple = await asUser("lea@demo.vow.test");
  await couple.from("rain_plans").upsert({ wedding_id: weddingId, active: true });
  await couple.from("rain_slots").delete().eq("wedding_id", weddingId);
  const inserted = await couple.from("rain_slots").insert({
    wedding_id: weddingId,
    title: "Cérémonie sous l'orangerie",
    starts_at: "16:00",
    place: "Orangerie",
    sort_order: 1,
  }).select("id");
  expect(inserted.error).toBeNull();

  const dj = await asUser("dj@demo.vow.test");
  const active = await dj.from("rain_slots").select("title").eq("wedding_id", weddingId);
  expect(active.data?.map((row) => row.title)).toContain("Cérémonie sous l'orangerie");
  await couple.from("rain_plans").update({ active: false }).eq("wedding_id", weddingId);
  const inactive = await dj.from("rain_slots").select("title").eq("wedding_id", weddingId);
  expect(inactive.data ?? []).toEqual([]);

  const florist = await asUser("fleurs@demo.vow.test");
  const groups = await florist.from("photo_groups").select("title").eq("wedding_id", weddingId);
  expect(groups.data ?? []).toEqual([]);
  const guests = await florist.from("guests").select("full_name").eq("wedding_id", weddingId);
  expect(guests.data ?? []).toEqual([]);
  const playlist = await florist.from("wedding_music").select("notes").eq("wedding_id", weddingId);
  expect(playlist.data ?? []).toEqual([]);

  const photographer = await asUser("camille@demo.vow.test");
  const slots = await photographer.from("timeline_slots").select("id").eq("wedding_id", weddingId).limit(1);
  const slotId = slots.data?.[0]?.id ?? "";
  const shifted = await photographer.rpc("shift_timeline_slot", { p_slot_id: slotId, p_new_time: "16:45", p_cascade: false });
  expect(shifted.error?.message ?? "").toMatch(/couple/i);
  const rewritten = await photographer.from("timeline_slots").update({ title: "Piraté" }).eq("id", slotId).select("title");
  expect(rewritten.data ?? []).toEqual([]);

  const djMusic = await dj.from("wedding_music").select("notes").eq("wedding_id", weddingId);
  expect(djMusic.data?.[0]?.notes).toContain("vie en rose");

  const sent = await couple.from("messages").insert({
    wedding_id: weddingId,
    author_id: "22222222-2222-4222-8222-222222222222",
    vendor_user_id: "a1111111-1111-4111-8111-111111111103",
    body: "Bonjour Chloé, les fleurs seront blanches.",
  }).select("id");
  expect(sent.error).toBeNull();
  const thread = await florist.from("messages").select("body").eq("wedding_id", weddingId);
  expect(thread.data?.some((row) => row.body.includes("fleurs seront blanches"))).toBe(true);
  const otherThread = await photographer.from("messages").select("body").eq("wedding_id", weddingId);
  expect(otherThread.data?.some((row) => row.body.includes("fleurs seront blanches")) ?? false).toBe(false);
  const files = await florist.from("documents").select("file_name").eq("wedding_id", weddingId);
  expect(files.data?.map((row) => row.file_name)).toContain("deroule-lea-hugo.txt");
  const foreignQuotes = await florist.from("quotes").select("id").eq("wedding_id", weddingId);
  expect(foreignQuotes.data ?? []).toEqual([]);
  const ownQuotes = await photographer.from("quotes").select("id").eq("wedding_id", weddingId);
  expect((ownQuotes.data ?? []).length).toBeGreaterThan(0);
  await couplePage.context().close();
});

async function login(page: Page, email: string) {
  await page.goto("/connexion", { waitUntil: "networkidle" });
  await revealPasswordLogin(page);
  await page.getByLabel("E-mail").first().fill(email);
  await page.getByLabel("Mot de passe").first().fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/connexion"));
}

async function freshPage(browser: Browser) {
  const context = await browser.newContext();
  return context.newPage();
}

function publicEnv() {
  const text = readFileSync(".env.local", "utf8");
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    env[key] = value;
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Clés Supabase publiques absentes de .env.local");
  return { url, key };
}

async function asUser(email: string): Promise<SupabaseClient> {
  const { url, key } = publicEnv();
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}
