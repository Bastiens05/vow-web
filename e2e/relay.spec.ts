import { expect, test, type Browser, type Page } from "@playwright/test";
import { revealPasswordSignup } from "./password-auth";

const password = "VowTest2026!";

test("le relais et les besoins restent dans le mariage", async ({ page, browser }) => {
  const stamp = Date.now().toString(36);
  const ownerEmail = `relais.${stamp}@vow.test`;
  const nextEmail = `suite.${stamp}@vow.test`;
  const outsiderEmail = `dehors.${stamp}@vow.test`;
  const coupleEmail = `maries.${stamp}@vow.test`;

  await signUpVendor(page, ownerEmail, "Camille Photo");
  await finishOnboarding(page, `Studio ${stamp}`);
  await page.goto("/espace/mariages/nouveau");
  await page.getByLabel("Premier prénom").fill("Noé");
  await page.getByLabel("Second prénom").fill("Alma");
  await page.getByLabel("Date du mariage").fill("2027-08-08");
  await page.getByRole("button", { name: "Créer le mariage" }).click();
  await expect(page.getByRole("heading", { name: "Inviter" })).toBeVisible();
  const weddingId = page.url().split("/mariage/")[1]?.split("/")[0] ?? "";

  await page.getByLabel("E-mail du destinataire").fill(coupleEmail);
  await page.getByRole("button", { name: "Créer l'invitation" }).click();
  const coupleLink = await page.locator("code").first().innerText();
  await page.getByLabel("E-mail du destinataire").fill(nextEmail);
  await page.getByLabel("Rôle").selectOption("vendor");
  await page.getByRole("button", { name: "Créer l'invitation" }).click();
  const vendorLink = await page.locator("li").filter({ hasText: nextEmail }).locator("code").innerText();

  const next = await freshPage(browser);
  await next.goto(new URL(vendorLink.trim()).pathname);
  await next.getByRole("link", { name: "Créer un compte" }).click();
  await signUpVendor(next, nextEmail, "Nina Suite");
  await finishOnboarding(next, `Table ${stamp}`);
  await next.goto(new URL(vendorLink.trim()).pathname);
  await next.getByRole("button", { name: "Rejoindre le mariage" }).click();
  await expect(next).toHaveURL(new RegExp(`/mariage/${weddingId}`));

  const couple = await freshPage(browser);
  await couple.goto(new URL(coupleLink.trim()).pathname);
  await couple.getByRole("link", { name: "Créer un compte" }).click();
  await signUpCouple(couple);
  await couple.getByRole("button", { name: "Rejoindre le mariage" }).click();
  await couple.goto(`/mariage/${weddingId}/jour`);
  await couple.getByLabel("Étape").fill("Cérémonie");
  await couple.getByLabel("Heure").fill("16:00");
  await couple.getByRole("button", { name: "Ajouter l'étape" }).click();
  await expect(couple.getByRole("heading", { name: "Cérémonie" })).toBeVisible();
  const add = couple.locator("form").filter({ has: couple.getByRole("button", { name: "Ajouter l'étape" }) });
  await add.getByLabel("Étape").fill("Cocktail");
  await add.getByLabel("Heure").fill("18:00");
  await add.getByRole("button", { name: "Ajouter l'étape" }).click();
  await expect(couple.getByRole("heading", { name: "Cocktail" })).toBeVisible();
  const ceremony = couple.locator("li").filter({ has: couple.getByRole("heading", { name: "Cérémonie" }) });
  await ceremony.getByRole("button", { name: "Modifier" }).click();
  await ceremony.getByLabel("Prestataire pour Cérémonie").selectOption({ label: "Camille Photo" });
  await ceremony.getByRole("button", { name: "Attribuer" }).click();
  const cocktail = couple.locator("li").filter({ has: couple.getByRole("heading", { name: "Cocktail" }) });
  await cocktail.getByRole("button", { name: "Modifier" }).click();
  const cocktailBox = cocktail.getByRole("combobox");
  const choices = await cocktailBox.locator("option").allInnerTexts();
  const nina = choices.find((choice) => choice.includes("Nina"));
  if (!nina) throw new Error(`options cocktail: ${choices.join(" | ")}`);
  await cocktailBox.selectOption({ label: nina });
  await couple.locator("li").filter({ hasText: "Cocktail" }).getByRole("button", { name: "Attribuer" }).click();

  await page.goto(`/mariage/${weddingId}/jour`);
  await page.getByRole("button", { name: "C'est prêt" }).click();
  await expect(page.getByText("Prêt").first()).toBeVisible();
  await next.goto("/alertes");
  await expect(next.getByText(/À vous : Cocktail/).first()).toBeVisible();

  await page.goto(`/mariage/${weddingId}/besoins`);
  await page.getByLabel("Stationnement").fill("Cour secrète");
  await page.getByRole("button", { name: "Enregistrer ma fiche" }).click();
  await expect(page.getByText("Cour secrète")).toBeVisible();

  const outsider = await freshPage(browser);
  await signUpVendor(outsider, outsiderEmail, "Paul Dehors");
  await finishOnboarding(outsider, `Dehors ${stamp}`);
  await outsider.goto(`/mariage/${weddingId}/besoins`);
  await expect(outsider).toHaveURL(/\/mariages$/);
  await expect(outsider.getByText("Cour secrète")).toHaveCount(0);
  await expect(outsider.getByText("Noé & Alma")).toHaveCount(0);

  await next.close();
  await couple.close();
  await outsider.close();
});

async function signUpVendor(page: Page, email: string, name: string) {
  await page.goto("/inscription");
  await page.getByRole("button", { name: "Je suis prestataire" }).click();
  await revealPasswordSignup(page, "Prestataire");
  await page.getByLabel("Nom complet").fill(name);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel(/^Mot de passe/).fill(password);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL("**/bienvenue**");
}

async function signUpCouple(page: Page) {
  await revealPasswordSignup(page, "Couple");
  await page.getByLabel("Nom complet").fill("Léa Martin");
  await page.getByLabel(/^Mot de passe/).fill(password);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL("**/invitation/**");
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
