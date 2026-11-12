import { readFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { passVendorWelcome, revealPasswordSignup } from "./password-auth";

const password = "VowTest2026!";

test("l'essai expiré ferme le prestataire, jamais les mariés", async ({ page, browser }) => {
  const stamp = Date.now().toString(36);
  const vendorEmail = `essai.${stamp}@vow.test`;
  const coupleEmail = `maries.${stamp}@vow.test`;
  const business = `Studio ${stamp}`;

  await signUpVendor(page, vendorEmail);
  await passVendorWelcome(page, business);
  const admin = service();
  const vendorId = await vendorProfileId(admin, vendorEmail);
  const userId = await profileId(admin, vendorEmail);
  await admin
    .from("vendor_billing")
    .update({ status: "trialing", trial_ends_at: "2020-01-01T00:00:00.000Z", tester_until: null })
    .eq("vendor_id", vendorId);

  await page.goto("/espace");
  await expect(page).toHaveURL(/\/abonnement$/);
  await expect(page.getByRole("button", { name: "Paiement bientôt disponible" })).toBeDisabled();

  const couple = await freshPage(browser);
  await signUpCouple(couple, coupleEmail);
  await couple.goto("/espace");
  await expect(couple).not.toHaveURL(/abonnement/);
  await couple.close();

  await admin.from("admins").insert({ user_id: userId });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Prestataires" })).toBeVisible();
  await expect(page.getByText(business).first()).toBeVisible();
  await page.goto("/espace");
  await expect(page).not.toHaveURL(/abonnement/);
  await admin.from("admins").delete().eq("user_id", userId);

  await page.goto("/espace");
  await expect(page).toHaveURL(/\/abonnement$/);
});

async function signUpVendor(page: Page, email: string) {
  await page.goto("/inscription");
  await revealPasswordSignup(page, "Prestataire");
  await page.getByLabel("Nom complet").fill("Camille Nouvelle");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel(/^Mot de passe/).fill(password);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/inscription"));
}

async function signUpCouple(page: Page, email: string) {
  await page.goto("/inscription");
  await revealPasswordSignup(page, "Couple");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel(/^Mot de passe/).fill(password);
  await page.getByRole("radio", { name: "Couple" }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/inscription"));
}

async function freshPage(browser: Browser) {
  return (await browser.newContext()).newPage();
}

function service() {
  const env = readEnv();
  return createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function profileId(admin: ReturnType<typeof service>, email: string) {
  const { data, error } = await admin.from("profiles").select("id").eq("email", email).single();
  if (error || !data) throw error ?? new Error("profil introuvable");
  return data.id;
}

async function vendorProfileId(admin: ReturnType<typeof service>, email: string) {
  const userId = await profileId(admin, email);
  const { data, error } = await admin.from("vendor_profiles").select("id").eq("user_id", userId).single();
  if (error || !data) throw error ?? new Error("prestataire introuvable");
  return data.id;
}

function readEnv() {
  const text = readFileSync(".env.local", "utf8");
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !serviceKey) throw new Error("Clés Supabase absentes");
  return { url, key, serviceKey };
}
