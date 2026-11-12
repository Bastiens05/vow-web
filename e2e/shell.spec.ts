import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { revealPasswordLogin, revealPasswordSignup } from "./password-auth";
import { createClient } from "@supabase/supabase-js";

const password = "VowTest2026!";

test("changer de mariage, se déconnecter, et garder le jour J réel au couple", async ({ page }) => {
  const stamp = Date.now().toString(36);
  const email = `shell.${stamp}@vow.test`;

  await signUp(page, email);
  await page.goto("/espace/mariages/nouveau");
  await page.getByLabel("Prénom", { exact: true }).nth(0).fill("Marie");
  await page.getByLabel("Nom", { exact: true }).nth(0).fill("Martin");
  await page.getByLabel("Prénom", { exact: true }).nth(1).fill("Marc");
  await page.getByLabel("Nom", { exact: true }).nth(1).fill("Bernard");
  await page.getByLabel("Date du mariage").fill("2027-06-01");
  await page.getByRole("button", { name: "Créer le mariage" }).click();
  await expect(page.getByRole("heading", { name: "Inviter" })).toBeVisible();
  const firstId = new URL(page.url()).pathname.split("/")[2] ?? "";

  await page.goto("/espace/mariages/nouveau");
  await page.getByLabel("Prénom", { exact: true }).nth(0).fill("Léa");
  await page.getByLabel("Nom", { exact: true }).nth(0).fill("Martin");
  await page.getByLabel("Prénom", { exact: true }).nth(1).fill("Hugo");
  await page.getByLabel("Nom", { exact: true }).nth(1).fill("Bernard");
  await page.getByLabel("Date du mariage").fill("2027-08-01");
  await page.getByRole("button", { name: "Créer le mariage" }).click();
  await expect(page.getByRole("heading", { name: "Inviter" })).toBeVisible();

  await page.goto(`/mariage/${firstId}`);
  await page.getByText("Changer de mariage").click();
  await page.getByRole("link", { name: "Léa & Hugo" }).click();
  await expect(page.getByRole("heading", { name: "Léa & Hugo" })).toBeVisible();
  await page.goto("/mariages");
  await expect(page.getByRole("heading", { name: "Marie & Marc" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Léa & Hugo" })).toBeVisible();

  await page.goto("/reglages");
  await page.getByRole("main").getByRole("button", { name: "Se déconnecter" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await page.goto("/espace");
  await expect(page).toHaveURL(/connexion/);

  await revealPasswordLogin(page);
  await page.getByLabel("E-mail").first().fill(email);
  await page.getByLabel("Mot de passe").first().fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/espace**");

  const vendor = await asUser(email);
  const userId = (await vendor.auth.getUser()).data.user?.id ?? "";
  const inserted = await vendor.from("timeline_slots").insert({
    wedding_id: firstId,
    title: "Interdit",
    starts_at: "16:00",
    created_by: userId,
  });
  expect(inserted.error).not.toBeNull();
  const admin = adminClient();
  const created = await admin
    .from("timeline_slots")
    .insert({ wedding_id: firstId, title: "Cérémonie", starts_at: "16:00", place: "", notes: "", created_by: userId })
    .select("id")
    .single();
  const slotId = created.data?.id ?? "";
  expect(slotId).toBeTruthy();
  const updated = await vendor.from("timeline_slots").update({ title: "Piraté" }).eq("id", slotId).select("title");
  expect(updated.data ?? []).toEqual([]);
  const kept = await admin.from("timeline_slots").select("title").eq("id", slotId).single();
  expect(kept.data?.title).toBe("Cérémonie");
  const denied = await vendor.rpc("shift_timeline_slot", {
    p_slot_id: slotId,
    p_new_time: "16:30",
    p_cascade: false,
  });
  expect(denied.error?.message ?? "").toMatch(/couple/i);

  const opened = await vendor.rpc("open_couple_demo");
  expect(opened.error).toBeNull();
  expect(opened.data).toBeTruthy();
  const demoPath = `/mariage/${opened.data}`;
  await page.goto(demoPath);
  await page.goto(`${demoPath}/jour`);
  await page.getByRole("button", { name: "Décaler", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "+30 min" })).toBeVisible();

  const stillDenied = await vendor.rpc("shift_timeline_slot", {
    p_slot_id: slotId,
    p_new_time: "16:45",
    p_cascade: false,
  });
  expect(stillDenied.error?.message ?? "").toMatch(/couple/i);
});

async function signUp(page: Page, email: string) {
  await page.goto("/inscription");
  await revealPasswordSignup(page, "Prestataire");
  await page.getByLabel("Nom complet").fill("Camille Shell");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel(/^Mot de passe/).fill(password);
  await page.getByRole("radio", { name: "Prestataire" }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/inscription"), { timeout: 20_000 });
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !serviceKey) throw new Error("Clés Supabase absentes de .env.local");
  return { url, key, serviceKey };
}

function adminClient() {
  const { url, serviceKey } = publicEnv();
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function asUser(email: string) {
  const { url, key } = publicEnv();
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}
