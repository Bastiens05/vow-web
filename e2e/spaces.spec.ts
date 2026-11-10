import { readFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { revealPasswordSignup } from "./password-auth";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const password = "VowTest2026!";

test("le jour J et les fiches restent séparés par rôle et par métier", async ({ page, browser }) => {
  const stamp = Date.now().toString(36);
  const vendorEmail = `photo.${stamp}@vow.test`;
  const coupleEmail = `maries.${stamp}@vow.test`;
  const catererEmail = `traiteur.${stamp}@vow.test`;
  const guestName = `Inès ${stamp}`;
  const groupTitle = `Famille ${stamp}`;

  await signUp(page, { name: "Camille Photo", email: vendorEmail, role: "Prestataire" });
  await expect(page.getByRole("heading", { name: "Votre page publique" })).toBeVisible();
  await page.getByLabel("Nom commercial").fill(`Studio ${stamp}`);
  await page.getByLabel("Ville").fill("Bordeaux");
  await page.getByLabel("Présentation").fill("Reportage de mariage, de la préparation jusqu'à la dernière danse.");
  await page.getByRole("button", { name: "Enregistrer la vitrine" }).click();
  await expect(page.getByText("Vitrine enregistrée.")).toBeVisible();

  await page.goto("/espace/mariages/nouveau");
  await page.getByLabel("Premier prénom").fill("Marie");
  await page.getByLabel("Second prénom").fill("Marc");
  await page.getByLabel("Date du mariage").fill("2027-09-12");
  await page.getByLabel("Lieu", { exact: true }).fill("Château");
  await page.getByRole("button", { name: "Créer le mariage" }).click();
  await expect(page.getByRole("heading", { name: "Inviter" })).toBeVisible();
  const weddingId = new URL(page.url()).pathname.split("/")[2] ?? "";
  expect(weddingId).toMatch(/^[0-9a-f-]{36}$/i);

  await page.getByLabel("E-mail du destinataire").fill(coupleEmail);
  await page.getByRole("button", { name: "Créer l'invitation" }).click();
  await expect(page.getByText(coupleEmail)).toBeVisible();
  await page.getByLabel("E-mail du destinataire").fill(catererEmail);
  await page.getByLabel("Rôle").selectOption("vendor");
  await page.getByRole("button", { name: "Créer l'invitation" }).click();
  await expect(page.getByText(catererEmail)).toBeVisible();

  const coupleUrl = await invitePath(page, coupleEmail);
  const catererUrl = await invitePath(page, catererEmail);

  await page.goto(`/mariage/${weddingId}/jour`);
  await expect(page.getByRole("button", { name: "+30 min" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Envoyer l’alerte" })).toHaveCount(0);
  await expect(page.getByText("Lecture seule")).toBeVisible();

  const couplePage = await freshPage(browser);
  await couplePage.goto(coupleUrl);
  await couplePage.getByRole("link", { name: "Créer un compte" }).click();
  await couplePage.waitForURL("**/inscription**");
  await signUp(couplePage, { name: "Marie Martin", email: coupleEmail, role: "Couple", emailLocked: true });
  await couplePage.waitForURL("**/invitation/**");
  await couplePage.getByRole("button", { name: "Rejoindre le mariage" }).click();
  await expect(couplePage.getByRole("heading", { name: "Marie & Marc" })).toBeVisible();
  await expect(couplePage.getByText("Espace mariés")).toBeVisible();

  await couplePage.getByRole("link", { name: "Pratique", exact: true }).click();
  await couplePage.getByLabel("Groupe").fill(groupTitle);
  await couplePage.getByRole("button", { name: "Ajouter le groupe" }).click();
  await expect(couplePage.getByText(groupTitle)).toBeVisible();
  await couplePage.getByRole("textbox", { name: "Nom" }).fill(guestName);
  await couplePage.getByRole("textbox", { name: "Régime" }).fill("Sans gluten");
  await couplePage.getByRole("button", { name: "Ajouter l'invité" }).click();
  await expect(couplePage.getByText(guestName)).toBeVisible();

  await couplePage.goto(`/mariage/${weddingId}/deroulement`);
  await couplePage.getByLabel("Nouveau moment").fill("Cérémonie");
  await couplePage.getByLabel("Heure").fill("16:00");
  await couplePage.getByRole("button", { name: "Ajouter au déroulé" }).click();
  await expect(couplePage.getByRole("heading", { name: "Cérémonie" })).toBeVisible();

  await couplePage.goto(`/mariage/${weddingId}/jour`);
  await expect(couplePage.getByRole("button", { name: "+30 min" }).first()).toBeVisible();
  await expect(couplePage.getByRole("button", { name: "Envoyer l’alerte" })).toBeVisible();

  const catererPage = await freshPage(browser);
  await catererPage.goto(catererUrl);
  await catererPage.getByRole("link", { name: "Créer un compte" }).click();
  await catererPage.waitForURL("**/inscription**");
  await signUp(catererPage, { name: "Nina Costa", email: catererEmail, role: "Prestataire", emailLocked: true });
  await catererPage.waitForURL("**/invitation/**");
  await catererPage.getByRole("button", { name: "Rejoindre le mariage" }).click();
  await expect(catererPage.getByRole("heading", { name: "Marie & Marc" })).toBeVisible();

  await catererPage.goto("/espace/profil");
  await catererPage.getByLabel("Nom commercial").fill(`Table ${stamp}`);
  await catererPage.getByLabel("Ville").fill("Bordeaux");
  await catererPage.getByLabel("Catégorie").selectOption({ label: "Traiteur" });
  await catererPage.getByLabel("Présentation").fill("Dîner, plan de table et régimes.");
  await catererPage.getByRole("button", { name: "Enregistrer la vitrine" }).click();
  await expect(catererPage.getByText("Vitrine enregistrée.")).toBeVisible();

  await catererPage.goto(`/mariage/${weddingId}/pratique`);
  await expect(catererPage.getByRole("heading", { name: "Tables et régimes" })).toBeVisible();
  await expect(catererPage.getByText(guestName)).toBeVisible();
  await expect(catererPage.getByRole("heading", { name: "Photos de groupe" })).toHaveCount(0);
  await expect(catererPage.getByText(groupTitle)).toHaveCount(0);

  await page.goto(`/mariage/${weddingId}/pratique`);
  await expect(page.getByRole("heading", { name: "Groupes photo" })).toBeVisible();
  await expect(page.getByText(groupTitle)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Invités" })).toHaveCount(0);
  await expect(page.getByText(guestName)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Invitations" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Groupes" })).toBeVisible();
  await expect(catererPage.getByRole("link", { name: "Invités" })).toBeVisible();

  const photographer = await asUser(vendorEmail);
  const hiddenGuests = await photographer.from("guests").select("full_name").eq("wedding_id", weddingId);
  expect(hiddenGuests.error).toBeNull();
  expect(hiddenGuests.data).toEqual([]);
  const visibleGroups = await photographer.from("photo_groups").select("title").eq("wedding_id", weddingId);
  expect(visibleGroups.data?.map((row) => row.title)).toContain(groupTitle);

  const caterer = await asUser(catererEmail);
  const hiddenGroups = await caterer.from("photo_groups").select("title").eq("wedding_id", weddingId);
  expect(hiddenGroups.error).toBeNull();
  expect(hiddenGroups.data).toEqual([]);
  const visibleGuests = await caterer.from("guests").select("full_name").eq("wedding_id", weddingId);
  expect(visibleGuests.data?.map((row) => row.full_name)).toContain(guestName);

  const slots = await photographer.from("timeline_slots").select("id, title").eq("wedding_id", weddingId);
  const ceremony = slots.data?.find((slot) => slot.title === "Cérémonie");
  expect(ceremony?.id).toBeTruthy();
  const denied = await photographer.rpc("shift_timeline_slot", {
    p_slot_id: ceremony?.id ?? "",
    p_new_time: "16:30",
    p_cascade: false,
  });
  expect(denied.error?.message ?? "").toMatch(/couple/i);

  const couple = await asUser(coupleEmail);
  const allowed = await couple.rpc("shift_timeline_slot", {
    p_slot_id: ceremony?.id ?? "",
    p_new_time: "16:20",
    p_cascade: false,
  });
  expect(allowed.error).toBeNull();

  await couplePage.close();
  await catererPage.close();
});

async function invitePath(page: Page, email: string) {
  const linkText = await page.locator("li", { hasText: email }).locator("code").innerText();
  const url = new URL(linkText.trim());
  return url.pathname + url.search;
}

async function signUp(
  page: Page,
  input: { name: string; email: string; role: "Prestataire" | "Couple"; emailLocked?: boolean },
) {
  if (!page.url().includes("/inscription")) {
    await page.goto("/inscription");
  }
  await revealPasswordSignup(page, input.role);
  await page.getByLabel("Nom complet").fill(input.name);
  if (!input.emailLocked) await page.getByLabel("E-mail").fill(input.email);
  await page.getByLabel(/^Mot de passe/).fill(password);
  await page.getByRole("radio", { name: input.role }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/inscription"), { timeout: 20_000 });
  } catch (error) {
    const alert = page.getByRole("alert");
    const detail = (await alert.count()) > 0 ? await alert.first().innerText() : "aucun message";
    throw new Error(`Inscription bloquée (${detail})`, { cause: error });
  }
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
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
