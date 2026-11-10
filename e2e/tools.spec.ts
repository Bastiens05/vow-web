import { readFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { revealPasswordSignup } from "./password-auth";

const password = "VowTest2026!";

test("une demande devient un mariage, un rappel part, et le prestataire ne décale pas", async ({ page, browser }) => {
  const stamp = Date.now().toString(36);
  const vendorEmail = `devis.${stamp}@vow.test`;
  const coupleEmail = `maries.${stamp}@vow.test`;
  const otherEmail = `autre.${stamp}@vow.test`;
  const slug = `studio-${stamp}`;
  const when = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);

  await signUp(page, { name: "Camille Devis", email: vendorEmail, role: "Prestataire" });
  await page.getByLabel("Nom commercial").fill(`Studio ${stamp}`);
  await page.getByLabel("Lien public").fill(slug);
  await page.getByLabel("Ville").fill("Bordeaux");
  await page.getByLabel("Présentation").fill("Reportage de mariage, de la préparation jusqu'à la dernière danse.");
  await page.getByLabel("Publier la vitrine").check();
  await page.getByRole("button", { name: "Enregistrer la vitrine" }).click();
  await expect(page.getByText("Vitrine publiée.")).toBeVisible();

  await page.goto(`/demande/${slug}`);
  await page.getByLabel("Vos noms").fill("Nina et Paul");
  await page.getByLabel("E-mail").fill(coupleEmail);
  await page.getByLabel("Date du mariage").fill(when);
  await page.getByLabel("Lieu").fill("Arcins");
  await page.getByLabel("Message").fill("On aimerait un reportage en lumière naturelle.");
  await page.getByRole("button", { name: "Envoyer la demande" }).click();
  await expect(page.getByText("Demande envoyée.")).toBeVisible();

  await page.goto("/demandes");
  await expect(page.getByRole("heading", { name: "Nina et Paul" })).toBeVisible();
  await page.getByRole("button", { name: "Créer le mariage et inviter" }).click();
  await expect(page.getByRole("heading", { name: "Inviter" })).toBeVisible();
  await expect(page.getByText(coupleEmail)).toBeVisible();
  const weddingId = new URL(page.url()).pathname.split("/")[2] ?? "";
  const link = await page.locator("code").first().innerText();

  await page.getByRole("link", { name: "Déroulé" }).click();
  await page.getByRole("button", { name: "Suggérer au couple" }).click();
  await expect(page.getByText("Suggestion envoyée : Photographe")).toBeVisible();
  await expect(page.getByLabel("Nouveau moment")).toHaveCount(0);

  const vendor = await asUser(vendorEmail);
  const blocked = await vendor.from("timeline_slots").insert({
    wedding_id: weddingId,
    title: "Interdit",
    starts_at: "18:00",
    created_by: (await vendor.auth.getUser()).data.user?.id ?? "",
  });
  expect(blocked.error).not.toBeNull();

  const otherPage = await freshPage(browser);
  await signUp(otherPage, { name: "Autre Studio", email: otherEmail, role: "Prestataire" });
  const other = await asUser(otherEmail);
  const hidden = await other.from("leads").select("id, full_names");
  expect(hidden.error).toBeNull();
  expect(hidden.data ?? []).toEqual([]);
  await otherPage.close();

  const couplePage = await freshPage(browser);
  await couplePage.goto(new URL(link.trim()).pathname);
  await couplePage.getByRole("link", { name: "Créer un compte" }).click();
  await couplePage.waitForURL("**/inscription**");
  await signUp(couplePage, { name: "Nina Martin", email: coupleEmail, role: "Couple", emailLocked: true });
  await couplePage.getByRole("button", { name: "Rejoindre le mariage" }).click();
  await expect(couplePage.getByRole("heading", { name: "Nina & Paul" })).toBeVisible();
  await couplePage.getByRole("link", { name: "Déroulé" }).click();
  await couplePage.getByRole("button", { name: "Appliquer" }).click();
  await expect(couplePage.getByRole("heading", { name: "Préparatifs photo" })).toBeVisible();

  const slots = await vendor.from("timeline_slots").select("id, title").eq("wedding_id", weddingId);
  const slotId = slots.data?.[0]?.id ?? "";
  expect(slotId).toBeTruthy();
  const updated = await vendor.from("timeline_slots").update({ title: "Piraté" }).eq("id", slotId).select("title");
  expect(updated.data ?? []).toEqual([]);
  const kept = await vendor.from("timeline_slots").select("title").eq("id", slotId);
  expect(kept.data?.[0]?.title).not.toBe("Piraté");
  const denied = await vendor.rpc("shift_timeline_slot", {
    p_slot_id: slotId,
    p_new_time: "17:00",
    p_cascade: false,
  });
  expect(denied.error?.message ?? "").toMatch(/couple/i);

  const cron = await page.request.get("/api/cron/reminders");
  expect(cron.ok()).toBeTruthy();
  await couplePage.goto("/alertes");
  await expect(couplePage.getByText(/Rappel J-30/).first()).toBeVisible();
  await couplePage.close();
});

test("le couple signe un contrat déposé par le prestataire", async ({ page, browser }) => {
  const stamp = Date.now().toString(36);
  const vendorEmail = `sign.${stamp}@vow.test`;
  const coupleEmail = `couple.${stamp}@vow.test`;

  await signUp(page, { name: "Camille Sign", email: vendorEmail, role: "Prestataire" });
  await page.getByLabel("Nom commercial").fill(`Atelier ${stamp}`);
  await page.getByLabel("Ville").fill("Bordeaux");
  await page.getByLabel("Présentation").fill("Contrats et reportage, simplement.");
  await page.getByRole("button", { name: "Enregistrer la vitrine" }).click();
  await expect(page.getByText("Vitrine enregistrée.")).toBeVisible();

  await page.goto("/espace/mariages/nouveau");
  await page.getByLabel("Premier prénom").fill("Léa");
  await page.getByLabel("Second prénom").fill("Hugo");
  await page.getByLabel("Date du mariage").fill("2027-07-01");
  await page.getByRole("button", { name: "Créer le mariage" }).click();
  await page.getByLabel("E-mail du destinataire").fill(coupleEmail);
  await page.getByRole("button", { name: "Créer l'invitation" }).click();
  await expect(page.getByText(coupleEmail)).toBeVisible();
  const link = await page.locator("code").first().innerText();

  await page.getByRole("link", { name: "Documents" }).click();
  await page.getByLabel("Ajouter un fichier").setInputFiles({
    name: "contrat.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.1\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"),
  });
  await expect(page.getByText("contrat.pdf")).toBeVisible();
  await page.getByRole("button", { name: "Demander la signature" }).click();
  await expect(page.getByText("Signature demandée")).toBeVisible();

  const couplePage = await freshPage(browser);
  await couplePage.goto(new URL(link.trim()).pathname);
  await couplePage.getByRole("link", { name: "Créer un compte" }).click();
  await couplePage.waitForURL("**/inscription**");
  await signUp(couplePage, { name: "Léa Martin", email: coupleEmail, role: "Couple", emailLocked: true });
  await couplePage.getByRole("button", { name: "Rejoindre le mariage" }).click();
  await couplePage.getByRole("link", { name: "Documents" }).click();
  await couplePage.getByLabel("Nom du signataire").fill("Léa Martin");
  const canvas = couplePage.getByLabel("Zone de signature");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("zone de signature introuvable");
  await couplePage.mouse.move(box.x + 24, box.y + 40);
  await couplePage.mouse.down();
  await couplePage.mouse.move(box.x + 140, box.y + 70);
  await couplePage.mouse.up();
  await couplePage.getByRole("checkbox", { name: /Je consens/ }).check();
  await couplePage.getByRole("button", { name: "Signer" }).click();
  await expect(couplePage.getByText("Signé").first()).toBeVisible();
  await couplePage.close();

  await page.reload();
  await expect(page.getByText("Signé").first()).toBeVisible();
});

async function signUp(
  page: Page,
  input: { name: string; email: string; role: "Prestataire" | "Couple"; emailLocked?: boolean },
) {
  if (!page.url().includes("/inscription")) await page.goto("/inscription");
  await page.getByRole("heading", { name: "Inscription" }).waitFor();
  await revealPasswordSignup(page, input.role);
  await page.getByLabel("Nom complet").fill(input.name);
  if (!input.emailLocked) await page.getByLabel("E-mail").fill(input.email);
  await page.getByLabel(/^Mot de passe/).fill(password);
  await page.getByRole("radio", { name: input.role }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/inscription"), { timeout: 20_000 });
}

async function freshPage(browser: Browser) {
  return (await browser.newContext()).newPage();
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
  if (!url || !key) throw new Error("Clés Supabase publiques absentes");
  return { url, key };
}

async function asUser(email: string) {
  const { url, key } = publicEnv();
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}
