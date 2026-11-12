import { expect, test } from "@playwright/test";

test("le prestataire crée son compte avec un mot de passe", async ({ page }) => {
  const stamp = Date.now().toString(36);
  const email = `compte.${stamp}@vow.test`;

  await page.goto("/inscription");
  await page.getByRole("button", { name: "Je suis prestataire" }).click();
  await page.getByRole("button", { name: "Traiteur" }).click();
  await page.getByLabel("Nom de l'activité").fill(`Table ${stamp}`);
  await page.getByLabel("Ville").fill("Bordeaux");
  await page.getByLabel("Nom complet").fill("Camille Table");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel(/^Mot de passe/).fill("VowTest2026!");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL("**/espace**");
  await expect(page.getByRole("heading", { name: `Table ${stamp}` })).toBeVisible();
  await expect(page.getByText("Léa & Hugo")).toHaveCount(0);
});

test("une invitation couple préremplit l'e-mail et n'affiche pas le choix de rôle", async ({ page }) => {
  await page.goto("/inscription?email=lea%40vow.test&role=couple&next=%2Finvitation%2Fabc");
  await expect(page.getByRole("button", { name: "Je suis prestataire" })).toHaveCount(0);
  await expect(page.getByLabel("E-mail")).toHaveValue("lea@vow.test");
  await expect(page.getByLabel(/^Mot de passe/)).toBeVisible();
  await expect(page.getByRole("radio", { name: "Couple" })).toBeChecked();
});
