import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { passVendorWelcome, revealPasswordLogin, revealPasswordSignup } from "./password-auth";

const password = "VowTest2026!";

test("inscription, invitation, messages, documents, jour J, abonnement et admin", async ({ page, browser }) => {
  const stamp = Date.now().toString(36);
  const vendorEmail = `surface.vendor.${stamp}@vow.test`;
  const coupleEmail = `surface.couple.${stamp}@vow.test`;
  const business = `Surface ${stamp}`;

  await signUp(page, { name: "Camille Surface", email: vendorEmail, role: "Prestataire" });
  await passVendorWelcome(page, business);
  await expect(page.getByRole("heading", { name: "Votre page publique" })).toBeVisible();

  await page.goto("/espace/mariages/nouveau");
  await page.getByLabel("Prénom", { exact: true }).nth(0).fill("Léa");
  await page.getByLabel("Nom", { exact: true }).nth(0).fill("Martin");
  await page.getByLabel("Prénom", { exact: true }).nth(1).fill("Hugo");
  await page.getByLabel("Nom", { exact: true }).nth(1).fill("Bernard");
  await page.getByLabel("Date du mariage").fill("2027-06-19");
  await page.getByLabel("Lieu", { exact: true }).fill("Château");
  await page.getByLabel("Ville du lieu").fill("Léognan");
  await page.getByRole("button", { name: "Créer le mariage" }).click();
  await expect(page.getByRole("heading", { name: "Inviter" })).toBeVisible();
  await page.getByLabel("E-mail du couple").fill(coupleEmail);
  await page.getByRole("button", { name: "Envoyer l'invitation" }).click();
  const code = page.locator("code").first();
  await expect(code).toContainText("http");
  const inviteUrl = new URL((await code.innerText()).trim());

  await page.getByRole("button", { name: "Déconnexion" }).click();
  await page.goto("/connexion");
  await revealPasswordLogin(page);
  await page.getByLabel("E-mail").first().fill(vendorEmail);
  await page.getByLabel("Mot de passe").first().fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/espace**");
  await expect(page.getByText("Léa & Hugo")).toBeVisible();

  await page.goto("/abonnement");
  await expect(page.getByRole("heading", { name: "Trois formules." })).toBeVisible();

  const couple = await freshPage(browser);
  await couple.goto(inviteUrl.pathname + inviteUrl.search);
  await couple.getByRole("link", { name: "Créer un compte" }).click();
  await couple.waitForURL("**/inscription**");
  await signUp(couple, { name: "Léa Martin", email: coupleEmail, role: "Couple", emailLocked: true });
  await couple.waitForURL("**/invitation/**");
  await couple.getByRole("button", { name: "Rejoindre le mariage" }).click();
  await expect(couple.getByRole("heading", { name: "Léa & Hugo" })).toBeVisible();

  await page.goto("/espace");
  await page.getByRole("link", { name: "Ouvrir l'espace" }).first().click();
  await page.waitForURL(/\/mariage\/[0-9a-f-]+$/i);
  const weddingUrl = page.url().replace(/\/$/, "");
  await page.goto(`${weddingUrl}/messages`);
  await page.getByLabel("Message").fill("Bonjour depuis la vérification visuelle.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Bonjour depuis la vérification visuelle.")).toBeVisible();

  await couple.goto(`${weddingUrl}/messages`);
  await couple.locator('a[href*="messages?avec="]').first().click();
  await expect(couple.getByText("Bonjour depuis la vérification visuelle.")).toBeVisible({ timeout: 20_000 });

  await page.goto(`${weddingUrl}/documents`);
  await expect(page.getByRole("heading", { name: "Documents", exact: true })).toBeVisible();
  await expect(page.getByText("Ajouter un fichier")).toBeVisible();
  await couple.goto(`${weddingUrl}/documents`);
  await expect(couple.getByRole("heading", { name: "Documents", exact: true })).toBeVisible();

  await couple.goto(`${weddingUrl}/jour`);
  await couple.getByLabel("Étape").fill("Cérémonie");
  await couple.getByLabel("Heure").fill("16:00");
  await couple.getByLabel("Lieu", { exact: true }).fill("Jardin");
  await couple.getByRole("button", { name: "Ajouter l'étape" }).click();
  await expect(couple.getByRole("heading", { name: "Cérémonie" })).toBeVisible();
  await page.goto(`${weddingUrl}/jour`);
  await expect(page.getByRole("heading", { name: "Cérémonie" })).toBeVisible();

  const admin = service();
  const userId = await profileId(admin, vendorEmail);
  await admin.from("admins").insert({ user_id: userId });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Prestataires" })).toBeVisible();
  await expect(page.getByText(vendorEmail).first()).toBeVisible();
  await couple.close();
});

async function signUp(
  page: Page,
  input: { name: string; email: string; role: "Prestataire" | "Couple"; emailLocked?: boolean },
) {
  if (!page.url().includes("/inscription")) await page.goto("/inscription");
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

function service() {
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
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Clés Supabase absentes");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function profileId(admin: ReturnType<typeof service>, email: string) {
  const { data, error } = await admin.from("profiles").select("id").eq("email", email).single();
  if (error || !data) throw error ?? new Error("profil introuvable");
  return data.id;
}
