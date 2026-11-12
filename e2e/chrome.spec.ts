import { expect, test, type Page } from "@playwright/test";
import { revealPasswordLogin } from "./password-auth";

test.use({ viewport: { width: 390, height: 844 } });

const password = "DemoVow2026!";

test("la page publique n'affiche pas le compte, et un compte ouvert quitte l'accueil", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Je suis prestataire" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Nous nous marions" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Connexion" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Alertes" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Navigation générale" })).toHaveCount(0);

  await login(page, "camille@demo.vow.test");
  await page.goto("/");
  await page.waitForURL("**/espace**");
  await expect(page.getByRole("link", { name: "Je suis prestataire" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Nouveautés" }).first()).toBeVisible();

  await page.goto("/p/atelier-lumiere");
  await expect(page.getByRole("heading", { name: "Atelier Lumière" })).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "Connexion" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Alertes" })).toHaveCount(0);
  await expect(page.getByRole("banner").getByText("Atelier Lumière")).toHaveCount(0);
});

test("les onglets n'ont pas de retour vers eux-mêmes, le mariage si", async ({ page }) => {
  await login(page, "camille@demo.vow.test");
  await page.goto("/mariages");
  await expect(page.getByRole("heading", { name: "Mariages" })).toBeVisible();
  await expect(page.getByRole("button", { name: "‹ Mariages" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "VOW" })).toBeVisible();

  await page.goto("/mariage/44444444-4444-4444-8444-444444444444");
  await expect(page.getByRole("heading", { name: "Votre métier" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Préparer" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Questions/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir le jour J" })).toHaveCount(0);
  await page.getByRole("button", { name: "‹ Mariages" }).click();
  await expect(page.getByRole("heading", { name: "Mariages" })).toBeVisible();
});

async function login(page: Page, email: string) {
  await page.goto("/connexion");
  await revealPasswordLogin(page);
  await page.getByLabel("E-mail").first().fill(email);
  await page.getByLabel("Mot de passe").first().fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/espace**");
}
