import { expect, test, type Page } from "@playwright/test";
import { revealPasswordLogin } from "./password-auth";

const password = "DemoVow2026!";
const weddingId = "44444444-4444-4444-8444-444444444444";

test("l'accueil du mariage montre la photo en arrivant depuis les invitations", async ({ page }) => {
  await login(page, "camille@demo.vow.test");
  await page.goto(`/mariage/${weddingId}`);
  await expect(goldenHero(page)).toBeVisible();

  await page.getByRole("navigation", { name: "Espace prestataire" }).getByRole("link", { name: "Invitations" }).click();
  await expect(page).toHaveURL(new RegExp(`/mariage/${weddingId}/inviter`));
  await expect(goldenHero(page)).toHaveCount(0);

  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/mariage/${weddingId}$`));
  await expect(goldenHero(page)).toBeVisible();
  await expect(page.getByRole("link", { name: "Ouvrir le Jour J" })).toBeVisible();
});

function goldenHero(page: Page) {
  return page.locator('img[src*="venue-golden"]');
}

async function login(page: Page, email: string) {
  await page.goto("/connexion");
  await revealPasswordLogin(page);
  await page.getByLabel("E-mail").first().fill(email);
  await page.getByLabel("Mot de passe").first().fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/espace**");
}
