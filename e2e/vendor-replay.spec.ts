import { readFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { revealPasswordLogin } from "./password-auth";

const password = "DemoVow2026!";
const weddingId = "44444444-4444-4444-8444-444444444444";

test("signature, besoins, hors ligne, météo et reset préviennent le bon métier", async ({ browser }) => {
  test.setTimeout(300_000);
  await expectCountdown(browser);

  const dj = await freshPage(browser);
  await login(dj, "dj@demo.vow.test");
  await dj.goto(`/mariage/${weddingId}/besoins`);
  await dj.getByLabel("Véhicule").fill("Utilitaire audit");
  await dj.getByRole("button", { name: "Enregistrer ma fiche" }).click();
  await expect(dj.getByText("Besoins enregistrés.")).toBeVisible();
  await dj.context().close();

  const florist = await freshPage(browser);
  await login(florist, "fleurs@demo.vow.test");
  await florist.goto(`/mariage/${weddingId}/besoins`);
  await expect(florist.getByText("Utilitaire audit")).toBeVisible();
  await florist.context().close();

  const vendor = await freshPage(browser);
  await login(vendor, "camille@demo.vow.test");
  await vendor.goto(`/mariage/${weddingId}/documents`, { waitUntil: "networkidle" });
  await vendor.getByText("deroule-lea-hugo.txt").waitFor();
  const fileName = `contrat-${Date.now()}.pdf`;
  await vendor.locator('input[type="file"]').setInputFiles({
    name: fileName,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.1\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"),
  });
  const row = vendor.locator("li", { hasText: fileName });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Demander la signature" }).click();
  await expect(row.getByText("Signature demandée", { exact: true })).toBeVisible();
  await vendor.context().close();

  const couple = await freshPage(browser);
  await login(couple, "lea@demo.vow.test");
  await couple.goto(`/mariage/${weddingId}/documents`, { waitUntil: "networkidle" });
  const heading = couple.getByRole("heading", { name: /Atelier Lumière/ });
  if (!(await heading.first().isVisible().catch(() => false))) {
    throw new Error((await couple.locator("body").innerText()).slice(0, 600));
  }
  const form = couple.locator("form", { has: couple.locator('input[name="signer_name"]') }).first();
  const panel = form.getByLabel("Zone de signature");
  await panel.scrollIntoViewIfNeeded();
  const box = await panel.boundingBox();
  if (!box) throw new Error("Zone de signature absente");
  await couple.mouse.move(box.x + 30, box.y + 40);
  await couple.mouse.down();
  await couple.mouse.move(box.x + Math.min(180, box.width - 10), box.y + 80, { steps: 8 });
  await couple.mouse.up();
  await form.locator('input[name="signer_name"]').fill("Léa Martin");
  await form.locator('input[name="consent"]').check();
  await form.getByRole("button", { name: "Signer" }).click();
  await expect.poll(async () => {
    const client = await asUser("lea@demo.vow.test");
    const { data } = await client.from("signature_requests").select("status, signer_name").eq("wedding_id", weddingId);
    return (data ?? []).some((row) => row.status === "signed" && row.signer_name === "Léa Martin");
  }).toBe(true);
  await expect(couple.getByText("Signé").first()).toBeVisible();

  const vendorAgain = await freshPage(browser);
  await login(vendorAgain, "camille@demo.vow.test");
  await vendorAgain.goto(`/mariage/${weddingId}/documents`);
  await expect(vendorAgain.getByText("Signé").first()).toBeVisible();
  await vendorAgain.goto("/nouveautes");
  await expect(vendorAgain.getByText("Le contrat a été signé.").first()).toBeVisible();

  await couple.goto(`/mariage/${weddingId}/jour`);
  await couple.getByRole("button", { name: /^Mauvais temps/ }).click();
  const duplicate = couple.getByRole("button", { name: "Dupliquer le programme beau temps" });
  if (await duplicate.isVisible().catch(() => false)) {
    await duplicate.click();
    await expect(couple.getByRole("heading", { name: "Cérémonie" })).toBeVisible();
  }
  await couple.getByRole("button", { name: "Autres actions" }).click();
  await couple.getByRole("button", { name: "Montrer cette version aux prestataires" }).click();
  await expect.poll(async () => {
    const notes = await asUser("dj@demo.vow.test");
    const { data } = await notes.from("wedding_notifications").select("body").eq("wedding_id", weddingId);
    return (data ?? []).some((row) => row.body.includes("mauvais temps"));
  }).toBe(true);

  const coupleClient = await asUser("lea@demo.vow.test");
  const reverted = await coupleClient.rpc("set_rain_plan", { p_wedding: weddingId, p_active: false });
  expect(reverted.error).toBeNull();
  await expect.poll(async () => {
    const notes = await asUser("dj@demo.vow.test");
    const { data } = await notes.from("wedding_notifications").select("body").eq("wedding_id", weddingId);
    return (data ?? []).some((row) => row.body.includes("beau temps"));
  }).toBe(true);
  let reset = false;
  for (let attempt = 0; attempt < 3 && !reset; attempt += 1) {
    await couple.getByRole("button", { name: /^Beau temps/ }).click();
    await couple.getByRole("button", { name: "Autres actions" }).click();
    try {
      await couple.getByRole("button", { name: "Réinitialiser le programme" }).click({ timeout: 2000 });
      reset = true;
    } catch {
      reset = false;
    }
  }
  if (!reset) throw new Error("Le menu de réinitialisation ne s'est pas ouvert.");
  await couple.getByRole("button", { name: "Supprimer" }).click();
  await expect.poll(async () => {
    const notes = await asUser("nina@demo.vow.test");
    const { data } = await notes.from("wedding_notifications").select("body").eq("wedding_id", weddingId);
    return (data ?? []).some((row) => row.body.includes("programme du jour a été retiré"));
  }).toBe(true);
  await couple.getByRole("status").filter({ hasText: "Programme retiré." }).getByRole("button", { name: "Annuler" }).click();
  await expect(couple.getByRole("heading", { name: "Cérémonie" })).toBeVisible();

  await vendorAgain.goto(`/mariage/${weddingId}/jour`);
  await vendorAgain.waitForFunction(
    (id) => {
      const raw = localStorage.getItem(`vow-jour-${id}`);
      return Boolean(raw && raw.includes("Cérémonie"));
    },
    weddingId,
  );
  await expect.poll(async () => vendorAgain.evaluate(async (id) => {
    const cache = await caches.open("vow-jour-v1");
    const match = await cache.match(`/mariage/${id}/jour`);
    return Boolean(match && (await match.text()).includes("Cérémonie"));
  }, weddingId)).toBe(true);
  await vendorAgain.context().setOffline(true);
  await expect(vendorAgain.getByText("Hors ligne. Le déroulé enregistré reste lisible.")).toBeVisible();
  await vendorAgain.reload();
  await expect(vendorAgain.getByText("Cérémonie").first()).toBeVisible();
  await vendorAgain.context().setOffline(false);

  await vendorAgain.context().close();
  await couple.context().close();
});

async function expectCountdown(browser: Browser) {
  const admin = service();
  const { data: before } = await admin.from("weddings").select("wedding_date").eq("id", weddingId).single();
  const { error } = await admin.from("weddings").update({ wedding_date: "2026-11-21" }).eq("id", weddingId);
  if (error) throw error;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const days = Math.round((Date.parse("2026-11-21T00:00:00Z") - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  const page = await freshPage(browser);
  try {
    await login(page, "camille@demo.vow.test");
    await expect(page.getByText(`J-${days}`).first()).toBeVisible();
    await page.goto(`/mariage/${weddingId}`);
    await expect(page.getByText(`J-${days}`).first()).toBeVisible();
  } finally {
    await admin.from("weddings").update({ wedding_date: before?.wedding_date ?? "2027-06-19" }).eq("id", weddingId);
    await page.context().close();
  }
}

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

function env() {
  const text = readFileSync(".env.local", "utf8");
  const values: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[trimmed.slice(0, eq).trim()] = value;
  }
  return values;
}

function service(): SupabaseClient {
  const values = env();
  const url = values.NEXT_PUBLIC_SUPABASE_URL;
  const key = values.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Service Supabase absent");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function asUser(email: string): Promise<SupabaseClient> {
  const values = env();
  const url = values.NEXT_PUBLIC_SUPABASE_URL;
  const key = values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || values.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Clés publiques absentes");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}
