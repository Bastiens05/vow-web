import { expect, test, type Browser, type Page } from "@playwright/test";
import { revealPasswordSignup } from "./password-auth";

const password = "VowTest2026!";

test("deux nouveaux prestataires ne voient que leur espace vide", async ({ page, browser }) => {
  const stamp = Date.now().toString(36);
  const firstEmail = `vide.${stamp}@vow.test`;
  const secondEmail = `autre.${stamp}@vow.test`;

  await signUp(page, firstEmail);
  await finishOnboarding(page, `Studio ${stamp}`);
  await expect(page.getByRole("link", { name: "Créez votre premier mariage" })).toBeVisible();
  await expect(page.getByText("Léa & Hugo")).toHaveCount(0);
  await expect(page.getByText("2 200,00 €")).toHaveCount(0);
  await expect(page.getByText("0,00 €").first()).toBeVisible();

  await page.goto("/mariages");
  await expect(page.getByRole("link", { name: "Créez votre premier mariage" })).toBeVisible();
  await page.getByRole("link", { name: "Créez votre premier mariage" }).click();
  await page.getByLabel("Prénom", { exact: true }).nth(0).fill("Inès");
  await page.getByLabel("Nom", { exact: true }).nth(0).fill("Martin");
  await page.getByLabel("Prénom", { exact: true }).nth(1).fill("Paul");
  await page.getByLabel("Nom", { exact: true }).nth(1).fill("Bernard");
  await page.getByLabel("Date du mariage").fill("2027-06-19");
  await page.getByRole("button", { name: "Créer le mariage" }).click();
  await expect(page.getByRole("heading", { name: "Inviter" })).toBeVisible();
  const weddingId = page.url().split("/mariage/")[1]?.split("/")[0] ?? "";

  await page.goto(`/mariage/${weddingId}/devis`);
  const quote = page.locator("form").filter({ has: page.getByRole("button", { name: "Créer le devis" }) });
  await quote.getByLabel("Titre").fill("Journée");
  await quote.getByLabel("Montant (€)").fill("900");
  await quote.getByRole("button", { name: "Créer le devis" }).click();
  await expect(page.getByText(/D-\d{4}-001/)).toBeVisible();

  const other = await freshPage(browser);
  await signUp(other, secondEmail);
  await finishOnboarding(other, `Maison ${stamp}`);
  await expect(other.getByText("Inès & Paul")).toHaveCount(0);
  await expect(other.getByText(/D-\d{4}-001/)).toHaveCount(0);
  await expect(other.getByText("0,00 €").first()).toBeVisible();
  await other.goto(`/mariage/${weddingId}`);
  await expect(other).toHaveURL(/\/mariages$/);
  await expect(other.getByText("Inès & Paul")).toHaveCount(0);
  await other.close();
});

async function signUp(page: Page, email: string) {
  await page.goto("/inscription");
  await page.getByRole("button", { name: "Je suis prestataire" }).click();
  await revealPasswordSignup(page, "Prestataire");
  await page.getByLabel("Nom complet").fill("Camille Nouvelle");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel(/^Mot de passe/).fill(password);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL("**/bienvenue**");
}

async function finishOnboarding(page: Page, business: string) {
  await page.getByRole("button", { name: "Photographe" }).click();
  await page.getByLabel("Nom de l'activité").fill(business);
  await page.getByLabel("Ville").fill("Bordeaux");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("heading", { name: "Votre logo" }).waitFor();
  await page.getByRole("link", { name: "Continuer" }).click();
  await page.waitForURL("**/espace**");
}

async function freshPage(browser: Browser) {
  return (await browser.newContext()).newPage();
}
